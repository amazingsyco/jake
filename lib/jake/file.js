
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tlrobinson Tom Robinson
// -- tolmasky Francisco Tolmasky
// -- dangoor Kevin Dangoor
// -- sstreza Steve Streza

exports.FNM_LEADING_DIR = 1 << 1;
exports.FNM_PATHNAME    = 1 << 2;
exports.FNM_PERIOD      = 1 << 3;
exports.FNM_NOESCAPE    = 1 << 4;
exports.FNM_CASEFOLD    = 1 << 5;
exports.FNM_DOTMATCH    = 1 << 6;

var fnmatchFlags = ["FNM_LEADING_DIR","FNM_PATHNAME","FNM_PERIOD","FNM_NOESCAPE","FNM_CASEFOLD","FNM_DOTMATCH"];

exports.fnmatch = function (pattern, string, flags) {
    var re = exports.patternToRegExp(pattern, flags);
    //print("PATTERN={"+pattern+"} REGEXP={"+re+"}");
    return re.test(string);
}

exports.patternToRegExp = function (pattern, flags) {
    var options = {};
    if (typeof flags === "number") {
        fnmatchFlags.forEach(function(flagName) {
            options[flagName] = !!(flags & exports[flagName]);
        });
    } else if (flags) {
        options = flags;
    }
    
    // FNM_PATHNAME: don't match separators
    var matchAny = options.FNM_PATHNAME ? "[^"+RegExp.escape(exports.SEPARATOR)+"]" : ".";
    
    // FNM_NOESCAPE match "\" separately
    var tokenizeRegex = options.FNM_NOESCAPE ?
        /\[[^\]]*\]|{[^}]*}|[^\[{]*/g :
        /\\(.)|\[[^\]]*\]|{[^}]*}|[^\\\[{]*/g;
    
    return new RegExp(
        '^' + 
        pattern.replace(tokenizeRegex, function (pattern, $1) {
            // if escaping is on, always return the next character escaped
            if (!options.FNM_NOESCAPE && (/^\\/).test(pattern) && $1) {
                return RegExp.escape($1);
            }
            if (/^\[/.test(pattern)) {
                var result = "[";
                pattern = pattern.slice(1, pattern.length - 1);
                // negation
                if (/^[!^]/.test(pattern)) {
                    pattern = pattern.slice(1);
                    result += "^";
                }
                // swap any range characters that are out of order
                pattern = pattern.replace(/(.)-(.)/, function(match, a, b) {
                    return a.charCodeAt(0) > b.charCodeAt(0) ? b + "-" + a : match;
                });
                return result + pattern.split("-").map(RegExp.escape).join("-") + ']';
            }
            if (/^\{/.test(pattern))
                return (
                    '(' +
                    pattern.slice(1, pattern.length - 1)
                    .split(',').map(function (pattern) {
                        return RegExp.escape(pattern);
                    }).join('|') +
                    ')'
                );
            return pattern
            .replace(exports.SEPARATORS_RE(), exports.SEPARATOR)    
            .split(new RegExp(
                exports.SEPARATOR + "?" +
                "\\*\\*" + 
                exports.SEPARATOR + "?"
            )).map(function (pattern) {
                return pattern.split(exports.SEPARATOR).map(function (pattern) {
                    if (pattern == "")
                        return "\\.?";
                    if (pattern == ".")
                        return;
                    if (pattern == "...")
                        return "(|\\.|\\.\\.(" + exports.SEPARATOR + "\\.\\.)*?)";
                    return pattern.split('*').map(function (pattern) {
                        return pattern.split('?').map(function (pattern) {
                            return RegExp.escape(pattern);
                        }).join(matchAny);
                    }).join(matchAny + '*');
                }).join(RegExp.escape(exports.SEPARATOR));
            }).join('.*?');
        }) +
        '$',
        options.FNM_CASEFOLD ? "i" : ""
    );
};

exports.glob = function (pattern, flags) {
    pattern = String(pattern || '');
    var parts = exports.split(pattern),
        paths = ['.'];
    
    if (exports.isAbsolute(pattern))
    {
        paths = parts[0] === '' ? ["/"] : [parts[0]];
        parts.shift();
    }

    if (parts[parts.length-1] == "**")
        parts[parts.length-1] = "*";
    
    parts.forEach(function (part) {
        if (part == "") {
        } else if (part == "**") {
            paths = globTree(paths);
        } else if (part == "...") {
            paths = globHeredity(paths);
        } else if (/[\\\*\?\[{]/.test(part)) {
            paths = globPattern(paths, part, flags);
        } else {
            paths = paths.map(function (path) {
                if (path)
                    return exports.join(path, part);
                return part;
            }).filter(function (path) {
                return exports.exists(path);
            });
        }

        // uniqueness
        var visited = {};
        paths = paths.filter(function (path) {
            var result = !Object.prototype.hasOwnProperty.call(visited, path);
            visited[path] = true;
            return result;
        });

    });
    
    if (paths[0] === "") paths.shift();
    
    return paths;
};

var globTree = function (paths) {
    return Array.prototype.concat.apply(
        [],
        paths.map(function (path) {
            if (!exports.isDirectory(path))
                return [];
            return exports.listDirectoryTree(path).map(function (child) {
                return exports.join(path, child);
            });
        })
    );
};

var globHeredity = function (paths) {
    return Array.prototype.concat.apply(
        [],
        paths.map(function (path) {
            var isRelative = exports.isRelative(path);
            var heredity = [];
            var parts = exports.split(exports.absolute(path));
            if (parts[parts.length - 1] == "")
                parts.pop();
            while (parts.length) {
                heredity.push(exports.join.apply(null, parts));
                parts.pop();
            }
            if (isRelative) {
                heredity = heredity.map(function (path) {
                    return exports.relative("", path);
                });
            }
            return heredity;
        })
    );
};

var globPattern = function (paths, pattern, flags) {
    var re = exports.patternToRegExp(pattern, flags);
    // print("PATTERN={"+pattern+"} REGEXP={"+re+"}");
    // use concat to flatten result arrays
    return Array.prototype.concat.apply([], paths.map(function (path) {
        if (!exports.isDirectory(path))
            return [];
        return [/*".", ".."*/].concat(exports.list(path)).filter(function (name) {
            return re.test(name);
        }).map(function (name) {
            if (path)
                return exports.join(path, name);
            return name;
        }).filter(function (path) {
            return exports.exists(path);
        });
    }));
};

exports.globPaths = function (pattern, flags) {
    return exports.glob(pattern, flags).map(function (path) {
        return new exports.Path(path);
    });
};
