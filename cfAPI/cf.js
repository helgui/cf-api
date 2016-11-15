'use strict';
const cfHost = 'http://codeforces.com/api'

var syncRequest = require('sync-request');
var crypto = require('crypto');

function queryString(params) {
    return params.map((p) => p.key + '=' + p.value).join('&');
}

function makeParam(key, value) {
    if (Array.isArray(value))
        return { key: key, value: value.join(';') }
    if (typeof value === 'boolean')
        return { key: key, value: (value ? 'true' : 'false')};
    return { key: key, value: value };
}

function paramList() {
    var count = arguments.length >> 1;
    var res = [];
    for (let i = 0; i < count; ++i) {
        if (typeof arguments[2 * i + 1] === 'undefined')
            continue;
        res.push(makeParam(arguments[2 * i], arguments[2 * i + 1]));
    }
    return res;
}

function objToList(obj) {
    var res = [];
    for (let key in obj)
        res.push(makeParam(key, obj[key]));
    return res;
}

function strCmp(a, b) {
    if (a < b)
        return -1;
    if (a == b)
        return 0;
    return 1;
}

function paramCmp(a, b) {
    if (a.key < b.key) {
        return -1;
    } else {
        if (a.key > b.key) {
            return 1;
        } else {
            return strCmp(a.value, b.value);
        }
    }
}

function randomString(len) {
    var res = '';
    for (let i = 0; i < len; ++i) {
        let rnd = Math.random().toString();
        res += rnd[rnd.length - 1];
    }
    return res;
}

/**
 * Creates an instance of Codeforces
 * @class Implements Codeforces API client
 * @constructor
 * @param {string} key - Public Codeforces API key
 * @param {string} secret - Secret Codeforces API key 
 */
function Codeforces(key, secret) {
    if (typeof key == 'undefined') {
        this.auth = false;
        return;
    }
    this.auth = true;
    this.key = key;
    this.secret = secret;
    this._error = '';
}

Codeforces.prototype._getRequestString = function(method, params) {
    method = '/' + method + '?';
    if (!this.auth) {
        return method + queryString(params);
    }
    params.push(makeParam('apiKey', this.key));
    params.push(makeParam('time', Math.floor(Date.now() / 1000)));
    params.sort(paramCmp);
    var hash = crypto.createHash('sha512');
    var rand = randomString(6);
    var secretString = rand + method + queryString(params) + '#' + this.secret;
    hash.update(secretString);
    params.push(makeParam('apiSig', rand + hash.digest('hex')));
    return method + queryString(params);
}

Codeforces.prototype._api = function (method, params) {
    var reqStr = this._getRequestString(method, params);
    var resp = syncRequest('GET', cfHost + reqStr);
    if (resp.statusCode != 200) {
        this._error = 'status code ' + resp.statusCode + ' received with request ' + reqStr;
        return null;
    }
    var apiResponse = JSON.parse(resp.body.toString());
    if (apiResponse.status == 'OK') {
        this._error = '';
        return apiResponse.result;
    }
    this._error = apiResponse.comment;
    return null;
}

/**
 * Requests information for one or mulptiple users
 * @param {string|string[]} handles - Handle or array of handles
 * @return {external:User[]} Array of requested users
 */
Codeforces.prototype.userInfo = function (handles) {
    return this._api('user.info', paramList('handles', handles));
}

/**
 * Requests user's rating history
 * @param {string} handle - User's handle
 * @return {external:RatingChange[]} Array of rating change points
 */
Codeforces.prototype.userRating = function (handle) {
    return this._api('user.rating', paramList('handle', handle));
}

/**
 * Requests list of rated users
 * @param {boolean} activeOnly - If true only active users will be listed
 * @return {external:User[]} Array representing all codeforces users
 */
Codeforces.prototype.ratedList = function (activeOnly) {
    return this._api('user.ratedList', paramList('activeOnly', activeOnly));
}

/**
 * Requests users's last submissions
 * @param {Object} params - Object containing parameters
 * @param {string} params.handle - Handle of user to request submissions of
 * @param {number} [params.from] - 1-based index of the first submission
 * @param {number} [params.count] - Number of submissions
 * @return {external:Submission[]} Array of requested submissions
 */ 
Codeforces.prototype.userStatus = function (params) {
    return this._api('user.status', objToList(params));
}

/**
 * Requests problems from problemset
 * @param {string | string[]} tags - Tag or array of tags
 * @return {external:Problem[]} Array of requested problems
 */
Codeforces.prototype.problems = function (tags) {
    return this._api('problemset.problems', paramList('tags', tags));
}

/**
 * Requests recent submissions
 * @param {number} count - Count of submissions to return (1000 is maximum value)
 * @return {external:Submission[]} Array of requested submissions
 */ 
Codeforces.prototype.recentStatus = function (count) {
    return this._api('problemset.recentStatus', paramList('count', count));
}

/**
 * Requests submissions for specified contest. Optionally can request submissions of specified user
 * @param {Object} params - Object containing parameters
 * @param {number} params.contestId - Id of the contest
 * @param {string} [params.handle] - User's handle
 * @param {number} [params.from] - 1-based index of the first submission
 * @param {number} [params.count] - Number of submissions
 * @return {external:Submision[]} Array of requested submissions
 */
Codeforces.prototype.contestStatus = function (params) {
    return this._api('contest.status', objToList(params));
}

/**
 * Requests information about all available contests
 * @param {boolean} gym - If true then gym contests are requested. Otherwise, reqular contests are requested
 * @return {external:Contest[]} Array of all available contests
 */
Codeforces.prototype.contestList = function (gym) {
    return this._api('contest.list', paramList('gym', gym));
}

/**
 * Requests contest standings
 * @param {Object} params - Object containing parameters
 * @param {number} params.contestId - Id of the contest
 * @param {number} [params.from] - 1-based index of the standings row to start the ranklist
 * @param {number} [params.count] - Number of rows to return
 * @param {string[]} [params.handles] - List of handles
 * @param {number} [params.room] - Room number to request standings of
 * @param {boolean} [params.showUnofficial] - Indicates which users must be shown in the list
 * @return {external:User[]} Array representing contests rankings
 */
Codeforces.prototype.standings = function (params) {
    return this._api('contest.standings', objToList(params));
}

/**
 * Requests hacks in the specified contest
 * @param {number} contestId - Id of the contest to request hacks in
 * @return {external:Hack[]} Array of requested hacks
 */
Codeforces.prototype.hacks = function (contestId) {
    return this._api('contest.hacks', paramList('contestId', contestId));
}

/**
 * Requests rating changes after the contest
 * @param {number} contestId - Id of the contest
 * @return {external:Submission[]} Array of requested submissions
 */
Codeforces.prototype.ratingChanges = function (contestId) {
    return this._api('contest.ratingChanges', paramList('contestId', contestId));   
}

/**
 * Requests friends of an authorized user
 * @param {boolean} onlineOnly - If true, only online users will be returned
 * @return {string[]} Array of friends handles
 */
Codeforces.prototype.userFriends = function (onlineOnly) {
    return this._api('user.friends', paramList('onlyOnline', onlineOnly));
}

/**
 * Requests a list of all user's blog entries
 * @param {string} handle - User's handle
 * @return {external:BlogEntry[]} Array of blog entries in the short form
 */
Codeforces.prototype.blogEntries = function (handle) {
    return this._api('user.blogEntries', paramList('handle', handle));
}

/**
 * Requests a list of recent events on codeforces
 * @param {number} maxCount - Number of ecent events to request
 * @return {external:RecentAction[]} Array of recent events on codeforces
 */
Codeforces.prototype.recentActions = function (maxCount) {
    return this._api('recentActions', paramList('maxCount', maxCount));
}

/**
 * Requests a full blog  entry
 * @param {number} blogEntryId - Id of a blog entry. It can be seen in the blog entry URL.
 * @return {external:BlogEntry} - Requested blog entry
 */
Codeforces.prototype.blogEntryView = function (blogEntryId) {
    return this._api('blogEntry.view', paramList('blogEntryId', blogEntryId));
}

/**
 * Requests comments to a blog entry
 * @param {number} blogEntryId - Id of a blog entry. It can be seen in the blog entry URL.
 * @return {external:Comment[]} - Array of the comments
 */
Codeforces.prototype.blogEntryComments = function (blogEntryId) {
    return this_api('blogEntry.comments', paramList('blogEntryId', blogEntryId));
}

/**
 * Returns error occurred during the last request
 * @return {string} Error description or empty string if no error occurred
 */
Codeforces.prototype.lastError = function () {
	return this._error;
}

module.exports = Codeforces;

/**
 * Class representing codeforces user
 * @external User
 * @see {@link http://codeforces.com/api/help/objects#User | User}
 */
/**
 * Class representing user's submission
 * @external Submission
 * @see {@link http://codeforces.com/api/help/objects#Submission | Submission}
 */
/**
 * Class representing codeforces contest
 * @external Contest
 * @see {@link http://codeforces.com | Contest}
 */
/**
 * Class representing user's rating change
 * @external RatingChange
 * @see {@link http://codeforces.com | RatingChange}
 */
/**
 * Class representing hacking attempt
 * @external Hack
 * @see {@link http://codeforces.com | Hack}
 */
/**
 * Class representing codeforces problem
 * @external Problem
 * @see {@link http://codeforces.com | Problem}
 */
/**
 * Class representing comment to a blog entry
 * @external Comment
 * @see {@link http://codeforces.com | Comment}
 */
/**
 * Class representing blog entry
 * @external BlogEntry
 * @see {@link http://codeforces.com | BlogEntry}
 */
/**
 * Class representing codeforces action
 * @external RecentAction
 * @see {@link http://codeforces.com | RecentAction}
 */
