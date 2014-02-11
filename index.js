var fs = require('fs'),
    dateHelper = require(__dirname+'/./lib/date.js'),
    caching = false;
function Cache(opt) {
    this.namespace = opt.namespace;
    this.tmp = opt.cacheFolder;
}
Cache.prototype = {
    /**
     * day, month,  year
     * @property compareTypeMapping
     * @type Object
     */
    compareTypeMapping: {
        "D": "day",
        "M": "month",
        "Y": "year"
    },
    /**
     * detect if a cache is expired
     * @method expiration
     * @param {String} filename
     * @param {Function} callback
     */
    expiration: function (filename, callback) {
        var record = this.getFileConfig(filename),
            now = new Date();
        if (!record) {
            callback({
                expired: true
            });
            return;
        }
        var expi = {
            limit: Number(record.duration.substr(0, record.duration.length - 1)),
            unit: this.compareTypeMapping[record.duration.substr(-1)]
        };
        if (dateHelper.difference(dateHelper.convertTime(record.createdAt), now, expi.unit) <= expi.limit) {
            callback({
                expired: false,
                record: record
            });
        } else {
            callback({
                expired: true,
                record: record
            });
        }
    },
    /**
     * append prefix of filename
     * @method getParsedFilename
     * @param {String} filename
     * @return {String}
     */
    getParsedFilename: function (filename) {
        return  this.namespace + "." + filename;
    },
    /**
     * get config by filename suffix.
     * @method getFileConfig
     * @param {String} filename filename suffix
     */
    getFileConfig: function (filename) {
        var conf;
        filename = this.getParsedFilename(filename);
        fs.readdirSync(this.tmp).some(function (file) {
            if (file.substr(file.length - filename.length) == filename) {
                var info = file.split(".").shift().split("_");
                conf = {
                    filename: file,
                    createdAt: info.shift(),
                    duration: info.shift()
                };
                return true;
            }
        });
        console.log(conf);
        return conf;
    },
    /**
     * get cached file
     * @method get
     * @param {Object} record
     * @param {String} record.filename filename in filesystem
     */
    get: function (record, callback) {
        fs.readFile(this.tmp + "/" + record.filename, callback);
    },
    /**
     * filename format: 1329842436829+1_30D.minify.sncf.sncf1.css
     * @method cache
     * @param {Object} [record] parsed record from filesystem
     * @param {String} data data to be cached
     * @param {Object} args
     * @param {String} args.filename filename suffix
     * @param {String} args.expiration duration date, ex: 30D, 1Y
     */
    cache: function (record, data, args, callback) {
        caching = true;
        args = args || {};
        if (record && record.filename) {
            fs.unlinkSync(this.tmp + "/" + record.filename);
        }
        args.filename = this.getParsedFilename(args.filename);
        var filename = this.tmp + "/" + dateHelper.getTime() + "_" + args.expiration + "." + args.filename;
        fs.writeFile(filename, data, {
            flags: 'w+'
        }, callback);

    }
};
module.exports = Cache;