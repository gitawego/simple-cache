(function (define) {
    define(['fs',
            'path',
            'mime',
            'crypto',
            'child_process',
            "events"],
        function (fs, nodePath, mime, crypto, Promise, baseHelper, child_process, events) {
            "use strict";
            var defer = Promise.defer;
            var fileCaches = {}
                , gzipCaches = {};
            /**
             * io helper
             * @class PlusNode.helpers.io
             * @singleton
             */
            return {
                /**
                 * @method cacheGzip
                 * @param {Object} params
                 * @param {Array|String} params.data
                 * @param {String} params.filename
                 * @param ioArgs
                 * @param {Object} ioArgs.req
                 * @param {Object} ioArgs.res
                 * @param {Function} ioArgs.next
                 * @return {PlusNode.helpers.Promise}
                 */
                cacheGzip:function (params, ioArgs) {
                    var deferred = defer(),
                        self = this;
                    if (gzipCaches[params.filename]) {
                        if (this.checkSum({
                            content:params.content
                        }) == gzipCaches[params.filename].checksum) {
                            ioArgs.res.set({
                                'Content-Length':gzipCaches[params.filename].content.length,
                                'Content-Encoding':'gzip',
                                'Vary':'Accept-Encoding'
                            });
                            deferred.callback({
                                content:gzipCaches[params.filename].content,
                                ioArgs:ioArgs
                            });
                            return deferred.promise;
                        }
                    }
                    this.gzipResponse(params.content, ioArgs, true).then(function (gzipRes) {
                        delete gzipCaches[params.filename];
                        if(!params.content){
                            console.log("crashed",params);
                        }
                        gzipCaches[params.filename] = {
                            content:gzipRes.content,
                            checksum:self.checkSum({
                                content:params.content
                            })
                        };
                        deferred.callback({
                            content:gzipRes.content,
                            ioArgs:ioArgs
                        });
                    }, deferred.errback);
                    return deferred.promise;
                },
                gzipResponse:function (data, ioArgs, doNotSend) {
                    var accept = ioArgs.req.headers['accept-encoding'] || ''
                        , gzip = !!~accept.toLowerCase().indexOf('gzip')
                        , deferred = defer();
                    if (!gzip) {
                        if (doNotSend) {
                            deferred.callback({
                                ioArgs:ioArgs,
                                content:data
                            });
                            return deferred.promise;
                        }
                        return ioArgs.res.send(data);
                    }
                    this.gzip(data).then(function (content) {
                        ioArgs.res.set({
                            'Content-Length':content.length,
                            'Content-Encoding':'gzip',
                            'Vary':'Accept-Encoding'
                        });
                        if (doNotSend) {
                            return deferred.callback({
                                ioArgs:ioArgs,
                                content:content
                            });
                        }
                        ioArgs.res.send(content);
                    }, function (err) {
                        PlusNode.log.error(err);
                        if (doNotSend) {
                            return deferred.errback(err);
                        }
                        ioArgs.res.send(data);
                    });
                    return deferred.promise;
                },
                gzip:function (data) {
                    var gzip = child_process.spawn('gzip', ['-9', '-c', '-f', '-n'])
                        , encoding = Buffer.isBuffer(data) ? 'binary' : 'utf8'
                        , buffer = []
                        , err
                        , deferred = defer();

                    gzip.stdout.on('data', function (data) {
                        buffer.push(data);
                    });

                    gzip.stderr.on('data', function (data) {
                        err = data + '';
                        buffer.length = 0;
                    });

                    gzip.on('close', function () {
                        if (err) return deferred.errback(err);
                        var size = 0
                            , index = 0
                            , i = buffer.length
                            , content;

                        while (i--) {
                            size += buffer[i].length;
                        }

                        content = new Buffer(size);

                        buffer.forEach(function (buff) {
                            var length = buff.length;
                            buff.copy(content, index, 0, length);
                            index += length;
                        });
                        buffer.length = 0;
                        deferred.callback(content);
                    });
                    gzip.stdin.end(data, encoding);
                    return deferred.promise;
                },
                /**
                 * generate content hash
                 * @method checkSum
                 * @param params
                 * @param {String} [params.algo='md5'] md5,sha1 or sha256
                 * @param {Array|String} params.content
                 * @param {String} params.file
                 * @return {PlusNode.helpers.Promise}
                 */
                checkSum:function (params) {
                    var deferred = defer();
                    params.algo = params.algo || "md5";
                    if (params.content) {
                        return crypto.createHash(params.algo).
                            update(params.content.toString("base64")).digest("hex");
                    }
                    var s = fs.ReadStream(params.file);
                    var shasum = crypto.createHash(params.algo);
                    s.on('data', function (d) {
                        shasum.update(d);
                    });
                    s.on('end', function () {
                        deferred.callback(shasum.digest('hex'));
                    });
                    return deferred.promise;
                },
                /**
                 * @method watchFile
                 * @param {String} filename
                 * @param {String} encode
                 * @param {Function} callback
                 * @param {Boolean} [single]
                 */
                watchFile:function (filename, encode, callback, single) {
                    //remove previous watched file
                    var self = this;
                    filename = nodePath.normalize(filename);
                    single && fs.unwatchFile(filename);
                    console.log("--------set to watch file", filename);
                    fs.watchFile(filename, function (curr, prev) {
                        if (curr.mtime == prev.mtime) {
                            return;
                        }
                        console.log("watch file change", filename);
                        var options = encode ? {
                            "encoding":encode
                        } : null;
                        self.streamFile(filename, options, {
                            renew:true,
                            watchFile:false
                        }).then(function (data) {
                            callback(null, data);
                        }, callback);
                    });
                },
                clearFileCaches:function () {
                    Object.keys(fileCaches).forEach(fs.unwatchFile);
                    fileCaches = {};
                },
                /**
                 * remove file
                 * @method rmFile
                 * @param {String} filename
                 * @return {PlusNode.helpers.Promise}
                 */
                rmFile:function (filename) {
                    var deferred = defer();
                    fs.unlink(filename, function (err) {
                        if (err) {
                            return deferred.errback(err);
                        }
                        return deferred.callback();
                    });
                    return deferred.promise;
                },
                /**
                 * @method rmDir
                 * @param {String} dir directory path
                 * @param {Boolean} r recursive
                 * @return {PlusNode.helpers.Promise}
                 */
                rmDir:function (dir, r) {
                    var folders = [], deferred = defer();
                    if (!r) {
                        fs.rmdir(dir, function (err) {
                            if (err) {
                                return deferred.errback(err);
                            }
                            return deferred.callback();
                        });
                        return deferred.promise;
                    }
                    fileWalker(dir).on("file",
                        function (file) {
                            fs.unlinkSync(file);
                        }).on("dir",
                        function (folder) {
                            folders.unshift(folder);
                        }).on("end", function () {
                            folders.forEach(function (f) {
                                fs.rmdirSync(f);
                            });
                            deferred.resolve();
                        });
                    return deferred.promise;
                },
                /**
                 * copy file with streaming
                 * @method cp
                 * @param {String} src must be a file name, but not folder name, wildcard isn't supported
                 * @param {String} dest
                 * @param {Object} params
                 * @param {Boolean} params.force override if destination exists
                 * @return {PlusNode.helpers.Promise}
                 */
                cp:function (src, dest, params) {
                    var deferred = defer(),
                        self = this,
                        params = params || {},
                        cp = function (src, dest) {
                            var writeStream = fs.createWriteStream(dest);
                            writeStream.on('close',
                                function () {
                                    deferred.callback();
                                }).on("error", function (err) {
                                    deferred.errback(err);
                                });
                            fs.createReadStream(src).pipe(writeStream);
                        };
                    this.stat(src).then(function (srcStats) {
                        if (srcStats.isDirectory()) {
                            PlusNode.log.error(new Error(src + " must be a file"));
                            return deferred.errback(src + " must be a file", true);
                        }
                        self.stat(dest).then(function (stats) {
                            if (stats.isDirectory()) {
                                dest += "/" + src.split("/").pop();
                                return cp(src, dest);
                            }
                            if (stats.isFile()) {
                                if (params.force) {
                                    fs.unlinkSync(dest);
                                    cp(src, dest);
                                } else {
                                    deferred.errback(dest + " exists", true);
                                }
                            }
                        }, function () {
                            cp(src, dest);
                        });
                    }, function (err) {
                        PlusNode.log.error(err);
                        deferred.errback(err);
                    });
                    return deferred.promise;
                },
                mv:function (src, dest, params) {
                    var deferred = defer(),
                        self = this;
                    this.cp(src, dest, params).then(function () {
                        self.stat(src).then(function (stats) {
                            if (stats.isFile()) {
                                fs.unlinkSync(src);
                                return deferred.callback();
                            }
                            if (stats.isDirectory()) {
                                fs.rmdirSync(src);
                                return deferred.callback();
                            }
                        }, function (err) {
                            deferred.errback(err);
                        });
                    }, function (err) {
                        deferred.errback(err);
                    });
                    return deferred.promise;
                },
                rename:function (p1, p2) {
                    var deferred = defer();
                    fs.rename(p1, p2, function (err) {
                        deferred[err ? "errback" : "callback"](err || null);
                    });
                    return deferred.promise;
                },
                stat:function (path) {
                    var deferred = defer();
                    path = nodePath.normalize(path);
                    fs.stat(path, function (err, stats) {
                        if (err) {
                            return deferred.errback(err, true);
                        }
                        deferred.callback(stats);
                    });
                    return deferred.promise;
                },
                writeFile:function (path, data, options) {
                    var deferred = defer();
                    options = options || {};
                    path = nodePath.normalize(path);
                    var writeStream = fs.createWriteStream(path, options);
                    writeStream.once("open", function () {
                        writeStream.write(data);
                        writeStream.end();
                    });
                    writeStream.on("error", function (e) {
                        deferred.errback(e);
                    });
                    writeStream.on('close', function () {
                        deferred.callback();
                    });
                    return deferred.promise;
                },
                /**
                 * media streaming
                 * @method streamMedia
                 * @param {String} path file path
                 * @param {Object} ioArgs a http connection
                 * @param {Object} ioArgs.req request object of a http connection
                 * @param {Object} ioArgs.res response object of a http connection
                 * @param {Object} ioArgs.next passe to not found
                 */
                streamMedia:function (path, ioArgs) {
                    fs.stat(path, function (err, stats) {
                        if (err) {
                            PlusNode.log.warn(err);
                            return ioArgs.next();
                        }
                        var opt = {
                            "flags":"r",
                            'bufferSize':64 * 1024
                        };
                        if (ioArgs.req.headers.range) {
                            var range = ioArgs.req.headers.range;
                            var total = stats.size;
                            var parts = range.replace(/bytes=/, "").split("-");
                            var start = +parts[0];
                            var end = +parts[1] || total - 1;
                            var chunksize = end - start + 1;
                            opt.start = start;
                            opt.end = end;
                            ioArgs.res.writeHead(206,
                                {
                                    "Content-Range":"bytes " + start + "-" + end + "/" + total,
                                    "Accept-Ranges":"bytes",
                                    "Content-Length":chunksize,
                                    "Content-Type":mime.lookup(path),
                                    "Last-Modified":stats.mtime
                                });
                        }
                        fs.createReadStream(path, opt).pipe(ioArgs.res);
                    });
                },
                /**
                 * read file
                 * @method streamFile
                 * @param {String} path
                 * @param {Object} options
                 * @param {Boolean|Object} [renew] remove cache of path
                 * @param {Boolean} renew.renew if force renew the cache
                 * @param {Boolean} renew.watchFile if watch the file change
                 * @param {Boolean} renew.noCache if cache the file
                 * @param {Boolean} [watchFile] watch file change
                 * @return {PlusNode.helpers.Promise}
                 */
                streamFile:function (path, options, renew, watchFile) {
                    if (arguments.length == 3 && typeof(arguments[2]) == "object") {
                        var params = arguments[2];
                        renew = params.renew;
                        watchFile = params.watchFile;
                        var noCache = params.noCache;
                    }
                    var deferred = defer(), self = this;
                    path = nodePath.normalize(path);
                    fileCaches = fileCaches || {};
                    if (renew || noCache) {
                        delete fileCaches[path];
                    }
                    if (fileCaches[path]) {
                        deferred.callback(fileCaches[path]);
                        return deferred.promise;
                    }
                    options = baseHelper.mixin({
                        'bufferSize':64 * 1024
                    }, options || {});
                    fs.stat(path, function (err, stats) {
                        if (err) {
                            return deferred.errback(err, true);
                        }
                        if (stats.isDirectory()) {
                            return deferred.errback(new Error("it's a directory"));
                        }
                        var buffer = [], error, offset = 0;
                        fs.createReadStream(path, options).on("data",
                            function (chunk) {
                                buffer.push(chunk);
                            }).on('error',function(err){
                                error = err;
                            }).on("end", function () {
                                if (error) {
                                    return deferred.errback(new Error(error));
                                }
                                var size = 0
                                    , index = 0
                                    , i = buffer.length
                                    , content;

                                while (i--) {
                                    size += buffer[i].length;
                                }

                                content = new Buffer(size);

                                buffer.forEach(function (buff) {
                                    buff = Buffer.isBuffer(buff)?buff:new Buffer(buff);
                                    var length = buff.length;
                                    buff.copy(content, index, 0, length);
                                    index += length;
                                });
                                buffer.length = 0;
                                fileCaches[path] = content;
                                deferred.callback(content);
                            });

                        if (!watchFile || noCache) {
                            return;
                        }
                        self.watchFile(path, options.encoding, function (err, data) {
                            if (err) {
                                return;
                            }
                            if (noCache) {
                                return;
                            }
                            fileCaches[path] = data;
                        }, true);
                    });
                    return deferred.promise;
                },
                /**
                 * read a file
                 * @method readFile
                 * @param {String} path
                 * @param {String} encoding
                 * @return {PlusNode.helpers.Promise}
                 */
                readFile:function (path, encoding) {
                    var deferred = defer(), self = this;
                    path = nodePath.normalize(path);
                    fs.readFile(path, encoding, function (err, fd) {
                        if (err) {
                            return deferred.errback(err);
                        }
                        deferred.callback(fd);
                    });
                    return deferred.promise;
                },
                /**
                 * execute a linux command
                 * @example
                 *      exec('mysqldump',['-uroot','-ptoto']).on('error',function(){}).on('exit',function(code){})
                 * @method exec
                 * @param {String} cmd
                 * @param {Array} opts
                 */
                exec:function (cmd, opts) {
                    var evt = new events.EventEmitter,
                        exe = child_process.spawn(cmd, opts);
                    exe.stdout.on('data', function (data) {
                        evt.emit("data", data.toString());
                    });
                    exe.stderr.on('data', function (data) {
                        evt.emit("error", data.toString());
                    });
                    exe.on('exit', function (code) {
                        evt.emit("exit", code);
                    });
                    return evt;
                }
            };
        });
})(typeof define != "undefined" ? define : function () {
    var result = arguments[arguments.length - 1]();
    if ('undefined' != typeof(result)) {
        module.exports = result;
    }
});