"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsdom_1 = require("jsdom");
const node_fetch_1 = __importDefault(require("node-fetch"));
const url_1 = require("url");
const date_fns_1 = require("date-fns");
function getFieldValue(dom, name) {
    const element = dom.window.document.querySelector(`[name="${name}"]`);
    if (!element) {
        throw new Error('Could not get field with name ' + name);
    }
    const value = element.value;
    return value;
}
function fetchWithCookies(cookieJar, url, options) {
    var _c;
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Requesting ', url);
        const cookieUrl = url;
        const res = yield node_fetch_1.default(url, Object.assign(Object.assign({}, (options !== null && options !== void 0 ? options : {})), { headers: Object.assign(Object.assign({}, (options !== null && options !== void 0 ? options : {}).headers), { cookie: cookieJar.getCookieStringSync(cookieUrl) }) }));
        const newCookies = (_c = res.headers.raw()) === null || _c === void 0 ? void 0 : _c['set-cookie'];
        if (newCookies) {
            newCookies.forEach(cookie => cookieJar.setCookieSync(cookie, cookieUrl));
        }
        return res;
    });
}
exports.Query = {
    games: (x, y, z, r) => __awaiter(void 0, void 0, void 0, function* () {
        var _c, _d, _e, _f, _g, _h, _j;
        const cookieJar = new jsdom_1.CookieJar();
        const firstGet = yield fetchWithCookies(cookieJar, 'https://fogis.svenskfotboll.se/Fogisdomarklient/Login/Login.aspx');
        const dom = new jsdom_1.JSDOM(yield firstGet.text());
        const params = new url_1.URLSearchParams();
        params.append('__VIEWSTATEGENERATOR', getFieldValue(dom, '__VIEWSTATEGENERATOR'));
        params.append('__EVENTVALIDATION', getFieldValue(dom, '__EVENTVALIDATION'));
        params.append('__VIEWSTATE', getFieldValue(dom, '__VIEWSTATE'));
        params.append('tbAnvandarnamn', z.principal.username);
        params.append('tbLosenord', z.principal.password);
        params.append('btnLoggaIn', 'Logga in');
        yield fetchWithCookies(cookieJar, 'https://fogis.svenskfotboll.se/Fogisdomarklient/Login/Login.aspx', {
            method: 'POST',
            body: params,
        });
        const res = yield fetchWithCookies(cookieJar, 'https://fogis.svenskfotboll.se/Fogisdomarklient/Uppdrag/UppdragUppdragLista.aspx');
        const pageDom = new jsdom_1.JSDOM(yield res.text());
        const rows = pageDom.window.document.querySelectorAll('table.fogisInfoTable tbody tr');
        if (!rows) {
            throw new Error('No table rows found.');
        }
        const games = [];
        for (const row of rows) {
            if (row.className === 'gomd') {
                continue;
            }
            if (row.tagName !== 'TR') {
                throw new Error('Found unknown row ' + row.tagName);
            }
            if (row.children.length !== 8) {
                throw new Error('Game column length was not 8 but ' + row.children.length);
            }
            const timeString = (_c = row.children.item(0)) === null || _c === void 0 ? void 0 : _c.textContent;
            const time = timeString
                ? date_fns_1.format(date_fns_1.parse(timeString, 'yyyy-MM-dd HH:mm', Date.now()).getTime(), "yyyy-MM-dd'T'HH:mm:ss.SSSXXXX")
                : null;
            const facilityColumn = row.children.item(5);
            const facility = (_d = facilityColumn === null || facilityColumn === void 0 ? void 0 : facilityColumn.childNodes.item(0).textContent) === null || _d === void 0 ? void 0 : _d.trim();
            const teams = (_e = row.children.item(4)) === null || _e === void 0 ? void 0 : _e.innerHTML;
            const teamRegexResult = teams === null || teams === void 0 ? void 0 : teams.match(/^(.*)&nbsp;-&nbsp;(.*)$/);
            const homeTeamName = teamRegexResult === null || teamRegexResult === void 0 ? void 0 : teamRegexResult[1];
            const awayTeamName = teamRegexResult === null || teamRegexResult === void 0 ? void 0 : teamRegexResult[2];
            if (!homeTeamName || !awayTeamName) {
                console.log({ teamRegexResult, teams });
                throw new Error('Unable to parse teams.');
            }
            const competitionName = (_f = row.children.item(1)) === null || _f === void 0 ? void 0 : _f.textContent;
            const round = Number((_g = row.children.item(2)) === null || _g === void 0 ? void 0 : _g.textContent);
            const refereeCol = row.children.item(6);
            const referees = [
                ...((_h = refereeCol === null || refereeCol === void 0 ? void 0 : refereeCol.querySelectorAll('span:not(.uppskjutenMatchDomaruppdrag)')) !== null && _h !== void 0 ? _h : []),
            ].reduce((agg, element) => {
                var _c, _d, _e, _f;
                const content = (_c = element.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                const parts = content === null || content === void 0 ? void 0 : content.match(/^\((.*?)\)\s+(.*)$/);
                const role = parts === null || parts === void 0 ? void 0 : parts[1];
                const name = parts === null || parts === void 0 ? void 0 : parts[2];
                if (!role || !name) {
                    console.log({ role, name, parts, content });
                    throw new Error('Unable to parse referee');
                }
                let phone = [];
                if (element.classList.contains('annanDomaresUppdrag')) {
                    const metadataNode = (_e = (_d = element.nextSibling) === null || _d === void 0 ? void 0 : _d.nextSibling) === null || _e === void 0 ? void 0 : _e.nextSibling;
                    const metadata = (_f = metadataNode === null || metadataNode === void 0 ? void 0 : metadataNode.textContent) === null || _f === void 0 ? void 0 : _f.trim();
                    if (!metadata) {
                        throw new Error('Could not find phone numbers for referee');
                    }
                    phone = [...new Set(metadata.match(/\+?\d+/g))];
                }
                return Object.assign(Object.assign({}, agg), { [keyForRole(role)]: {
                        name,
                        phone,
                    } });
            }, {});
            games.push({
                time,
                id: (_j = row.children.item(3)) === null || _j === void 0 ? void 0 : _j.textContent,
                location: {
                    name: facility,
                },
                homeTeam: {
                    name: homeTeamName,
                },
                awayTeam: {
                    name: awayTeamName,
                },
                context: {
                    competition: {
                        name: competitionName,
                    },
                    round,
                },
                referees,
            });
        }
        return games;
    }),
    me: (_a, _b, context) => {
        if (!context.principal) {
            return null;
        }
        return {
            username: context.principal.username,
            password: context.principal.password,
        };
    },
};
function keyForRole(role) {
    switch (role) {
        case 'Dom':
            return 'referee';
        case 'AD1':
            return 'assistantReferee1';
        case 'AD2':
            return 'assistantReferee2';
        case '4:e dom':
            return 'fourthOfficial';
        default:
            throw new Error('Unknown referee role ' + role);
    }
}
//# sourceMappingURL=index.js.map