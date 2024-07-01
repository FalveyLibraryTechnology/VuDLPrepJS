import checkdate = require("locutus/php/datetime/checkdate");
import dateFormat = require("locutus/php/datetime/date");
import strtotime = require("locutus/php/datetime/strtotime");

export default class DateSanitizer {
    static sanitize(_date: string): string {
        // Strip brackets; we'll assume guesses are correct.
        let date = _date.replace(/\[|\]/g, "");

        // Special case -- first four characters are not a year:
        if (!date.match(/^[0-9]{4}/)) {
            // 'n.d.' means no date known -- give up!
            if (date.match(/n\.?\s*d\.?/)) {
                return null;
            }

            // strtotime can only handle a limited range of dates; let's extract
            // a year from the string and temporarily replace it with a known
            // good year; we'll swap it back after the conversion.
            const yearMatches = date.match(/[0-9]{4}/);
            const year = (yearMatches ?? [])[0] ?? false;
            if (year) {
                date = date.replace(year, "2000");
            }
            try {
                const time = strtotime(date);
                if (time) {
                    date = dateFormat("Y-m-d", time);
                    if (year) {
                        date = date.replace("2000", year);
                    }
                } else {
                    return null;
                }
            } catch (e) {
                return null;
            }
        }

        // If we've gotten this far, we at least know that we have a valid year.
        const padNumber = function (val: string | number, targetLength: number): string {
            const paddedVal = "0".repeat(targetLength) + val;
            return paddedVal.substring(paddedVal.length - targetLength);
        };
        const year = padNumber(parseInt(date.substring(0, 4)), 4);

        // Let's get rid of punctuation and normalize separators:
        date = date.replace(/[. ?]/g, "").replace(/\/|--|-0/g, "-");

        // If multiple dates are &'ed together, take just the first:
        date = date.split("&")[0].trim();

        // Default to January 1 if no month/day present:
        let month, day;
        if (date.length < 5) {
            month = day = "01";
        } else {
            // If we have year + month, parse that out:
            if (date.length < 8) {
                day = "01";
                const matches = date.match(/^[0-9]{4}-([0-9]{1,2})/);
                if (matches && typeof matches[1] !== "undefined") {
                    month = padNumber(matches[1], 2);
                } else {
                    month = "01";
                }
            } else {
                // If we have year + month + day, parse that out:
                const matches = date.match(/^[0-9]{4}-([0-9]{1,2})-([0-9]{1,2})/);
                if (matches && typeof matches[2] !== "undefined") {
                    month = padNumber(matches[1], 2);
                    day = padNumber(matches[2], 2);
                } else {
                    month = day = "01";
                }
            }
        }

        // Make sure month/day/year combination is legal. Make it legal if it isn't.
        if (!checkdate(month, day, year)) {
            day = "01";
            if (!checkdate(month, day, year)) {
                month = "01";
            }
        }

        return year + "-" + month + "-" + day + "T00:00:00Z";
    }
}
