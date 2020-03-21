import { IResolverObject } from 'apollo-server'
import { JSDOM, CookieJar } from 'jsdom'
import fetch from 'node-fetch'
import { URLSearchParams } from 'url'
import { parse, format } from 'date-fns'

function getFieldValue(dom: JSDOM, name: string) {
  const element = dom.window.document.querySelector(`[name="${name}"]`)
  if (!element) {
    throw new Error('Could not get field with name ' + name)
  }
  const value = (element as HTMLInputElement).value
  return value
}

async function fetchWithCookies(
  cookieJar: CookieJar,
  url: string,
  options?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> {
  console.log('Requesting ', url)
  const cookieUrl = url
  const res = await fetch(url, {
    ...(options ?? {}),
    headers: {
      ...(options ?? {}).headers,
      cookie: cookieJar.getCookieStringSync(cookieUrl),
    },
  })

  const newCookies = res.headers.raw()?.['set-cookie']
  if (newCookies) {
    newCookies.forEach(cookie => cookieJar.setCookieSync(cookie, cookieUrl))
  }

  return res
}

export const Query: IResolverObject = {
  games: async (x, y, z, r) => {
    const cookieJar = new CookieJar()

    const firstGet = await fetchWithCookies(
      cookieJar,
      'https://fogis.svenskfotboll.se/Fogisdomarklient/Login/Login.aspx',
    )

    const dom = new JSDOM(await firstGet.text())
    const params = new URLSearchParams()
    params.append('__VIEWSTATEGENERATOR', getFieldValue(dom, '__VIEWSTATEGENERATOR'))
    params.append('__EVENTVALIDATION', getFieldValue(dom, '__EVENTVALIDATION'))
    params.append('__VIEWSTATE', getFieldValue(dom, '__VIEWSTATE'))
    params.append('tbAnvandarnamn', z.principal.username)
    params.append('tbLosenord', z.principal.password)
    params.append('btnLoggaIn', 'Logga in')

    await fetchWithCookies(
      cookieJar,
      'https://fogis.svenskfotboll.se/Fogisdomarklient/Login/Login.aspx',
      {
        method: 'POST',
        body: params,
      },
    )

    const res = await fetchWithCookies(
      cookieJar,
      'https://fogis.svenskfotboll.se/Fogisdomarklient/Uppdrag/UppdragUppdragLista.aspx',
    )
    const pageDom = new JSDOM(await res.text())
    const rows = pageDom.window.document.querySelectorAll('table.fogisInfoTable tbody tr')
    if (!rows) {
      throw new Error('No table rows found.')
    }

    const games = []
    for (const row of rows) {
      if (row.className === 'gomd') {
        continue
      }
      if (row.tagName !== 'TR') {
        throw new Error('Found unknown row ' + row.tagName)
      }
      if (row.children.length !== 8) {
        throw new Error('Game column length was not 8 but ' + row.children.length)
      }
      const timeString = row.children.item(0)?.textContent
      const time = timeString
        ? format(
            parse(timeString, 'yyyy-MM-dd HH:mm', Date.now()).getTime(),
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXXX",
          )
        : null
      const facilityColumn = row.children.item(5)
      const facility = facilityColumn?.childNodes.item(0).textContent?.trim()
      const teams = row.children.item(4)?.innerHTML
      const teamRegexResult = teams?.match(/^(.*)&nbsp;-&nbsp;(.*)$/)
      const homeTeamName = teamRegexResult?.[1]
      const awayTeamName = teamRegexResult?.[2]
      if (!homeTeamName || !awayTeamName) {
        console.log({ teamRegexResult, teams })
        throw new Error('Unable to parse teams.')
      }
      const competitionName = row.children.item(1)?.textContent
      const round = Number(row.children.item(2)?.textContent)

      const refereeCol = row.children.item(6)
      const referees = [
        ...(refereeCol?.querySelectorAll('span:not(.uppskjutenMatchDomaruppdrag)') ?? []),
      ].reduce((agg, element) => {
        const content = element.textContent?.trim()
        const parts = content?.match(/^\((.*?)\)\s+(.*)$/)
        const role = parts?.[1]
        const name = parts?.[2]
        if (!role || !name) {
          console.log({ role, name, parts, content })
          throw new Error('Unable to parse referee')
        }
        let phone: string[] = []
        if (element.classList.contains('annanDomaresUppdrag')) {
          const metadataNode = element.nextSibling?.nextSibling?.nextSibling
          const metadata = metadataNode?.textContent?.trim()
          if (!metadata) {
            throw new Error('Could not find phone numbers for referee')
          }
          phone = [...new Set(metadata.match(/\+?\d+/g))]
        }
        return {
          ...agg,
          [keyForRole(role)]: {
            name,
            phone,
          },
        }
      }, {})

      games.push({
        time,
        id: row.children.item(3)?.textContent,
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
      })
    }

    return games
  },
  me: (_a, _b, context) => {
    if (!context.principal) {
      return null
    }
    return {
      username: context.principal.username,
      password: context.principal.password,
    }
  },
}

function keyForRole(role: string): string {
  switch (role) {
    case 'Dom':
      return 'referee'
    case 'AD1':
      return 'assistantReferee1'
    case 'AD2':
      return 'assistantReferee2'
    case '4:e dom':
      return 'fourthOfficial'
    default:
      throw new Error('Unknown referee role ' + role)
  }
}
