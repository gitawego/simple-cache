(function (define) {
    define(function () {
        "use strict";
        /**
         * @class PlusNode.helpers.date
         * @singleton
         */
        var _exports = {
            regxp:{
                ISO8601:/([0-9]{4})[-./]?(?:([0-9]{3}$)|([0-9]{1,2})|(?:W([0-9]{2})-?([0-9]{2})))[-./]?([0-9]{1,2})?(?:[ TAD]{0,4}([0-9]{1,2}):?([0-9]{1,2})(?::?([0-9]{1,2})(?:\.([0-9]+))?)?(?: (AM|PM))?(Z|(?:(?:(?:, \w+)|(?: ))?([-+])([0-9]{2}):?([0-9]{2})))?)?/gi
            },
            /**
             * get time string with timezone
             * @method getTime
             * @param {String|Date} [time] if time is a string, timezone will be the local one
             */
            getTime:function (time) {
                time = time || new Date();
                time = time instanceof Date ? time : (new Date(+time));
                var timezone = this.getTimeZone(time);
                return "" + time.getTime() + (timezone >= 0 ? "+" + timezone : timezone);
            },
            /**
             * @method getTimeZone
             * @param {String|Date} time if time is a string, timezone will be the local one
             */
            getTimeZone:function (time) {
                time = time instanceof Date ? time : (new Date(+time));
                return -time.getTimezoneOffset() / 60;
            },
            /**
             * @method calcTime
             * @param {String|Date} time
             * @param {Number} offset timezone offset
             * @return Date
             */
            calcTime:function (time, offset) {
                // create Date object for current location
                var d = time || new Date();
                d = d instanceof Date ? d : (new Date(+d));
                // convert to msec
                // add local time zone offset
                // get UTC time in msec
                var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                // create new Date object for different city
                // using supplied offset
                return new Date(utc + (3600000 * offset));
            },
            /**
             * conver given time (with timezone)
             * @method convertTime
             * @param {String} time
             * @return Date
             */
            convertTime:function (time) {
                if (!time) {
                    return 0;
                }
                var timezone = time.match(/[\+\-]([0-9]*)/g);
                if (!timezone) {
                    return new Date(+time);
                }
                timezone = timezone[0];
                time = time.split(timezone).shift();
                return this.calcTime(time, timezone);
            },
            convertToLocal:function(time){
                if(!time){
                    return 0;
                }
                var timezone = time.match(/[\+\-]([0-9]*)/g);
                if (!timezone) {
                    return new Date(+time);
                }
                timezone = timezone[0];
                return new Date(+time.split(timezone).shift());
                //return this.calcTime(time,time.getTimezoneOffset()/-60);
            },
            /**
             * @method getTZStr
             * @param {Number} timezone timezone offset
             */
            getTZStr:function (timezone) {
                var pos = timezone >= 0 ? "+" : "-";
                timezone = pos == "+" ? timezone : -timezone;
                while ((timezone + "").length < 2) {
                    timezone = "0" + timezone;
                }
                while ((timezone + "").length < 4) {
                    timezone += "0";
                }
                return "GMT " + pos + timezone;
            },
            /**
             * @method isValidTime
             * @param {String} value
             * @return Boolean
             */
            isValidTime:function (value) {
                var hasMeridian = false;
                var re = /^\d{1,2}[:]\d{2}([:]\d{2})?( [aApP][mM]?)?$/;
                if (!re.test(value)) {
                    return false;
                }
                if (value.toLowerCase().indexOf("p") != -1) {
                    hasMeridian = true;
                }
                if (value.toLowerCase().indexOf("a") != -1) {
                    hasMeridian = true;
                }
                var values = value.split(":");
                if ((parseFloat(values[0]) < 0) || (parseFloat(values[0]) > 23)) {
                    return false;
                }
                if (hasMeridian) {
                    if ((parseFloat(values[0]) < 1) || (parseFloat(values[0]) > 12)) {
                        return false;
                    }
                }
                if ((parseFloat(values[1]) < 0) || (parseFloat(values[1]) > 59)) {
                    return false;
                }
                if (values.length > 2) {
                    if ((parseFloat(values[2]) < 0) || (parseFloat(values[2]) > 59)) {
                        return false;
                    }
                }
                return true;
            },
            /**
             * timezone is ignored
             * @method strToDate
             * @param str
             */
            strToDate:function (str) {
                var newD;
                str.replace(this.regxp.ISO8601, function (match) {
                    var y = arguments[1],
                        M = parseInt(arguments[3], 10) || 1,
                        d = arguments[6] || 1,
                        h = arguments[7] || 0,
                        m = arguments[8] || 0,
                        s = arguments[9] || 0;
                    newD = new Date(y, M - 1, d, h, m, s);
                });
                return newD;
            },
            /**
             * javascript equivalent of php function: phpDate<br />
             * example : <pre class='brush:javascript'>
             date('H:m:s \\m \\i\\s \\m\\o\\n\\t\\h', 1062402400); //return: '09:09:40 m is month'
             date('F j, Y, g:i a', 1062462400); //return: 'September 2, 2003, 2:26 am'
             date('Y W o', 1062462400); //return: '2003 36 2003'
             x = date('Y m d', (new Date()).getTime()/1000); (x+'').length == 10 // 2009 01 09 return: true
             date('W', 1104534000); //return: '53'
             date('B t', 1104534000); //return: '999 31'
             date('W', 1293750000); // 2010-12-31 return: '52'
             date('W Y-m-d', 1293974054); // 2011-01-02 return: '52 2011-01-02'
             * </pre>
             * @method phpDate
             * @param {String} format
             * @param {Number} timestamp
             */
            phpDate:function (format, timestamp) {
                var that = this, jsdate, f, formatChr = /\\?([a-z])/gi, formatChrCb, // Keep this here (works, but for code commented-out
                // below for file size reasons)
                //, tal= [],
                    _pad = function (n, c) {
                        if ((n = n + '').length < c) {
                            return new Array((++c) - n.length).join('0') + n;
                        }
                        return n;
                    }, txt_words = ["Sun", "Mon", "Tues", "Wednes", "Thurs", "Fri", "Satur", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                formatChrCb = function (t, s) {
                    return f[t] ? f[t]() : s;
                };
                f = {
                    // Day
                    d:function () { // Day of month w/leading 0; 01..31
                        return _pad(f.j(), 2);
                    },
                    D:function () { // Shorthand day name; Mon...Sun
                        return f.l().slice(0, 3);
                    },
                    j:function () { // Day of month; 1..31
                        return jsdate.getDate();
                    },
                    l:function () { // Full day name; Monday...Sunday
                        return txt_words[f.w()] + 'day';
                    },
                    N:function () { // ISO-8601 day of week; 1[Mon]..7[Sun]
                        return f.w() || 7;
                    },
                    S:function () { // Ordinal suffix for day of month; st, nd, rd, th
                        var j = f.j();
                        return j > 4 && j < 21 ? 'th' : {1:'st', 2:'nd', 3:'rd'}[j % 10] || 'th';
                    },
                    w:function () { // Day of week; 0[Sun]..6[Sat]
                        return jsdate.getDay();
                    },
                    z:function () { // Day of year; 0..365
                        var a = new Date(f.Y(), f.n() - 1, f.j()), b = new Date(f.Y(), 0, 1);
                        return Math.round((a - b) / 864e5) + 1;
                    },

                    // Week
                    W:function () { // ISO-8601 week number
                        var a = new Date(f.Y(), f.n() - 1, f.j() - f.N() + 3), b = new Date(a.getFullYear(), 0, 4);
                        return _pad(1 + Math.round((a - b) / 864e5 / 7), 2);
                    },

                    // Month
                    F:function () { // Full month name; January...December
                        return txt_words[6 + f.n()];
                    },
                    m:function () { // Month w/leading 0; 01...12
                        return _pad(f.n(), 2);
                    },
                    M:function () { // Shorthand month name; Jan...Dec
                        return f.F().slice(0, 3);
                    },
                    n:function () { // Month; 1...12
                        return jsdate.getMonth() + 1;
                    },
                    t:function () { // Days in month; 28...31
                        return (new Date(f.Y(), f.n(), 0)).getDate();
                    },

                    // Year
                    L:function () { // Is leap year?; 0 or 1
                        return new Date(f.Y(), 1, 29).getMonth() === 1 | 0;
                    },
                    o:function () { // ISO-8601 year
                        var n = f.n(), W = f.W(), Y = f.Y();
                        return Y + (n === 12 && W < 9 ? -1 : n === 1 && W > 9);
                    },
                    Y:function () { // Full year; e.g. 1980...2010
                        return jsdate.getFullYear();
                    },
                    y:function () { // Last two digits of year; 00...99
                        return (f.Y() + "").slice(-2);
                    },

                    // Time
                    a:function () { // am or pm
                        return jsdate.getHours() > 11 ? "pm" : "am";
                    },
                    A:function () { // AM or PM
                        return f.a().toUpperCase();
                    },
                    B:function () { // Swatch Internet time; 000..999
                        var H = jsdate.getUTCHours() * 36e2, // Hours
                            i = jsdate.getUTCMinutes() * 60, // Minutes
                            s = jsdate.getUTCSeconds(); // Seconds
                        return _pad(Math.floor((H + i + s + 36e2) / 86.4) % 1e3, 3);
                    },
                    g:function () { // 12-Hours; 1..12
                        return f.G() % 12 || 12;
                    },
                    G:function () { // 24-Hours; 0..23
                        return jsdate.getHours();
                    },
                    h:function () { // 12-Hours w/leading 0; 01..12
                        return _pad(f.g(), 2);
                    },
                    H:function () { // 24-Hours w/leading 0; 00..23
                        return _pad(f.G(), 2);
                    },
                    i:function () { // Minutes w/leading 0; 00..59
                        return _pad(jsdate.getMinutes(), 2);
                    },
                    s:function () { // Seconds w/leading 0; 00..59
                        return _pad(jsdate.getSeconds(), 2);
                    },
                    u:function () { // Microseconds; 000000-999000
                        return _pad(jsdate.getMilliseconds() * 1000, 6);
                    },
                    // Timezone
                    e:function () { // Timezone identifier; e.g. Atlantic/Azores, ...
                        // The following works, but requires inclusion of the very large
                        // timezone_abbreviations_list() function.
                        /*              return this.date_default_timezone_get();
                         */
                        throw 'Not supported (see source code of date() for timezone on how to add support)';
                    },
                    I:function () { // DST observed?; 0 or 1
                        // Compares Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC.
                        // If they are not equal, then DST is observed.
                        var a = new Date(f.Y(), 0), // Jan 1
                            c = Date.UTC(f.Y(), 0), // Jan 1 UTC
                            b = new Date(f.Y(), 6), // Jul 1
                            d = Date.UTC(f.Y(), 6); // Jul 1 UTC
                        return 0 + ((a - c) !== (b - d));
                    },
                    O:function () { // Difference to GMT in hour format; e.g. +0200
                        var tzo = jsdate.getTimezoneOffset(), a = Math.abs(tzo);
                        return (tzo > 0 ? "-" : "+") + _pad(Math.floor(a / 60) * 100 + a % 60, 4);
                    },
                    P:function () { // Difference to GMT w/colon; e.g. +02:00
                        var O = f.O();
                        return (O.substr(0, 3) + ":" + O.substr(3, 2));
                    },
                    T:function () { // Timezone abbreviation; e.g. EST, MDT, ...
                        // The following works, but requires inclusion of the very
                        // large timezone_abbreviations_list() function.
                        /*              var abbr = '', i = 0, os = 0, default = 0;
                         if (!tal.length) {
                         tal = that.timezone_abbreviations_list();
                         }
                         if (that.php_js && that.php_js.default_timezone) {
                         default = that.php_js.default_timezone;
                         for (abbr in tal) {
                         for (i=0; i < tal[abbr].length; i++) {
                         if (tal[abbr][i].timezone_id === default) {
                         return abbr.toUpperCase();
                         }
                         }
                         }
                         }
                         for (abbr in tal) {
                         for (i = 0; i < tal[abbr].length; i++) {
                         os = -jsdate.getTimezoneOffset() * 60;
                         if (tal[abbr][i].offset === os) {
                         return abbr.toUpperCase();
                         }
                         }
                         }
                         */
                        return 'UTC';
                    },
                    Z:function () { // Timezone offset in seconds (-43200...50400)
                        return -jsdate.getTimezoneOffset() * 60;
                    },
                    // Full Date/Time
                    c:function () { // ISO-8601 date.
                        return 'Y-m-d\\Th:i:sP'.replace(formatChr, formatChrCb);
                    },
                    r:function () { // RFC 2822
                        return 'D, d M Y H:i:s O'.replace(formatChr, formatChrCb);
                    },
                    U:function () { // Seconds since UNIX epoch
                        return jsdate.getTime() / 1000 | 0;
                    }
                };
                this.date = function (format, timestamp) {
                    that = this;
                    jsdate = ((typeof timestamp === 'undefined') ? new Date() : // Not provided
                        (timestamp instanceof Date) ? new Date(timestamp) : // JS Date()
                            new Date(timestamp * 1000) // UNIX timestamp (auto-convert to int)
                        );
                    return format.replace(formatChr, formatChrCb);
                };
                return this.date(format, timestamp);
            }
        };
        /**
         * @method difference
         * @param {Date} date1
         * @param {Date} date2 Date object.  If not specified, the current Date is used.
         * @param {String} interval
         */
        _exports.difference = (function () {
            var diff = function (/*Date*/date1, /*Date?*/date2, /*String?*/interval) {
                //	summary:
                //		Get the difference in a specific unit of time (e.g., number of
                //		months, weeks, days, etc.) between two dates, rounded to the
                //		nearest integer.
                //	date1:
                //		Date object
                //	date2:
                //		Date object.  If not specified, the current Date is used.
                //	interval:
                //		A string representing the interval.  One of the following:
                //			"year", "month", "day", "hour", "minute", "second",
                //			"millisecond", "quarter", "week", "weekday"
                //		Defaults to "day".

                date2 = date2 || new Date();
                interval = interval || "day";
                var yearDiff = date2.getFullYear() - date1.getFullYear();
                var delta = 1; // Integer return value

                switch (interval) {
                    case "quarter":
                        var m1 = date1.getMonth();
                        var m2 = date2.getMonth();
                        // Figure out which quarter the months are in
                        var q1 = Math.floor(m1 / 3) + 1;
                        var q2 = Math.floor(m2 / 3) + 1;
                        // Add quarters for any year difference between the dates
                        q2 += (yearDiff * 4);
                        delta = q2 - q1;
                        break;
                    case "weekday":
                        var days = Math.round(diff(date1, date2, "day"));
                        var weeks = parseInt(diff(date1, date2, "week"));
                        var mod = days % 7;

                        // Even number of weeks
                        if (mod == 0) {
                            days = weeks * 5;
                        } else {
                            // Weeks plus spare change (< 7 days)
                            var adj = 0;
                            var aDay = date1.getDay();
                            var bDay = date2.getDay();

                            weeks = parseInt(days / 7);
                            mod = days % 7;
                            // Mark the date advanced by the number of
                            // round weeks (may be zero)
                            var dtMark = new Date(date1);
                            dtMark.setDate(dtMark.getDate() + (weeks * 7));
                            var dayMark = dtMark.getDay();

                            // Spare change days -- 6 or less
                            if (days > 0) {
                                switch (true) {
                                    // Range starts on Sat
                                    case aDay == 6:
                                        adj = -1;
                                        break;
                                    // Range starts on Sun
                                    case aDay == 0:
                                        adj = 0;
                                        break;
                                    // Range ends on Sat
                                    case bDay == 6:
                                        adj = -1;
                                        break;
                                    // Range ends on Sun
                                    case bDay == 0:
                                        adj = -2;
                                        break;
                                    // Range contains weekend
                                    case (dayMark + mod) > 5:
                                        adj = -2;
                                }
                            } else if (days < 0) {
                                switch (true) {
                                    // Range starts on Sat
                                    case aDay == 6:
                                        adj = 0;
                                        break;
                                    // Range starts on Sun
                                    case aDay == 0:
                                        adj = 1;
                                        break;
                                    // Range ends on Sat
                                    case bDay == 6:
                                        adj = 2;
                                        break;
                                    // Range ends on Sun
                                    case bDay == 0:
                                        adj = 1;
                                        break;
                                    // Range contains weekend
                                    case (dayMark + mod) < 0:
                                        adj = 2;
                                }
                            }
                            days += adj;
                            days -= (weeks * 2);
                        }
                        delta = days;
                        break;
                    case "year":
                        delta = yearDiff;
                        break;
                    case "month":
                        delta = (date2.getMonth() - date1.getMonth()) + (yearDiff * 12);
                        break;
                    case "week":
                        // Truncate instead of rounding
                        // Don't use Math.floor -- value may be negative
                        delta = parseInt(diff(date1, date2, "day") / 7);
                        break;
                    case "day":
                        delta /= 24;
                    // fallthrough
                    case "hour":
                        delta /= 60;
                    // fallthrough
                    case "minute":
                        delta /= 60;
                    // fallthrough
                    case "second":
                        delta /= 1000;
                    // fallthrough
                    case "millisecond":
                        delta *= date2.getTime() - date1.getTime();
                }
                // Round for fractional values and DST leaps
                return Math.round(delta); // Number (integer)
            };
            return diff;
        })();
        /**
         * @method Format
         * @param {Date} date
         */
        var Format = function () {
            // Some common format strings
            this.masks = {
                "default":"ddd mmm dd yyyy HH:MM:ss",
                "shortDate":"m/d/yy",
                "mediumDate":"mmm d, yyyy",
                "longDate":"mmmm d, yyyy",
                "fullDate":"dddd, mmmm d, yyyy",
                "shortTime":"h:MM TT",
                "mediumTime":"h:MM:ss TT",
                "longTime":"h:MM:ss TT Z",
                "isoDate":"yyyy-mm-dd",
                "isoTime":"HH:MM:ss",
                "isoDateTime":"yyyy-mm-dd'T'HH:MM:ss",
                "isoUtcDateTime":"UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
            };
            // Internationalization strings
            this.i18n = {
                dayNames:[
                    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
                    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
                ],
                monthNames:[
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
                    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
                ]
            };

            var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
                timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
                timezoneClip = /[^-+\dA-Z]/g,
                pad = function (val, len) {
                    val = String(val);
                    len = len || 2;
                    while (val.length < len) val = "0" + val;
                    return val;
                };
            var dF = this;
            // Regexes and supporting functions are cached through closure
            this.format = function (date, mask, utc) {
                //var dF = dateFormat;

                // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
                if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                    mask = date;
                    date = undefined;
                }

                // Passing date through Date applies Date.parse, if necessary
                date = date ? new Date(date) : new Date;
                if (isNaN(date)) throw SyntaxError("invalid date");

                mask = String(dF.masks[mask] || mask || dF.masks["default"]);

                // Allow setting the utc argument via the mask
                if (mask.slice(0, 4) == "UTC:") {
                    mask = mask.slice(4);
                    utc = true;
                }

                var _ = utc ? "getUTC" : "get",
                    d = date[_ + "Date"](),
                    D = date[_ + "Day"](),
                    m = date[_ + "Month"](),
                    y = date[_ + "FullYear"](),
                    H = date[_ + "Hours"](),
                    M = date[_ + "Minutes"](),
                    s = date[_ + "Seconds"](),
                    L = date[_ + "Milliseconds"](),
                    o = utc ? 0 : date.getTimezoneOffset(),
                    flags = {
                        d:d,
                        dd:pad(d),
                        ddd:dF.i18n.dayNames[D],
                        dddd:dF.i18n.dayNames[D + 7],
                        m:m + 1,
                        mm:pad(m + 1),
                        mmm:dF.i18n.monthNames[m],
                        mmmm:dF.i18n.monthNames[m + 12],
                        yy:String(y).slice(2),
                        yyyy:y,
                        h:H % 12 || 12,
                        hh:pad(H % 12 || 12),
                        H:H,
                        HH:pad(H),
                        M:M,
                        MM:pad(M),
                        s:s,
                        ss:pad(s),
                        l:pad(L, 3),
                        L:pad(L > 99 ? Math.round(L / 10) : L),
                        t:H < 12 ? "a" : "p",
                        tt:H < 12 ? "am" : "pm",
                        T:H < 12 ? "A" : "P",
                        TT:H < 12 ? "AM" : "PM",
                        Z:utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                        o:(o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                        S:["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                    };

                return mask.replace(token, function ($0) {
                    return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
                });
            };
        };
        _exports.format = function () {
            return new Format;
        };
        return _exports;
    });
})(typeof define !== "undefined" ? define : function () {
    var result = arguments[arguments.length - 1]();
    if ("undefined" != typeof(result)) {
        module.exports = result;
    }
});
