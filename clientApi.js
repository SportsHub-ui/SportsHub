(function () {
  const TEAM_IDS = {
    "Arizona Diamondbacks": 109,
    "Atlanta Braves": 144,
    "Baltimore Orioles": 110,
    "Boston Red Sox": 111,
    "Chicago Cubs": 112,
    "Chicago White Sox": 145,
    "Cincinnati Reds": 113,
    "Cleveland Guardians": 114,
    "Colorado Rockies": 115,
    "Detroit Tigers": 116,
    "Houston Astros": 117,
    "Kansas City Royals": 118,
    "Los Angeles Angels": 108,
    "Los Angeles Dodgers": 119,
    "Miami Marlins": 146,
    "Milwaukee Brewers": 158,
    "Minnesota Twins": 142,
    "New York Mets": 121,
    "New York Yankees": 147,
    "Oakland Athletics": 133,
    "Philadelphia Phillies": 143,
    "Pittsburgh Pirates": 134,
    "San Diego Padres": 135,
    "San Francisco Giants": 137,
    "Seattle Mariners": 136,
    "St. Louis Cardinals": 138,
    "Tampa Bay Rays": 139,
    "Texas Rangers": 140,
    "Toronto Blue Jays": 141,
    "Washington Nationals": 120
  };

  const DIVISION_IDS = {
    "Baltimore Orioles": 201,
    "Boston Red Sox": 201,
    "New York Yankees": 201,
    "Tampa Bay Rays": 201,
    "Toronto Blue Jays": 201,
    "Chicago White Sox": 202,
    "Cleveland Guardians": 202,
    "Detroit Tigers": 202,
    "Kansas City Royals": 202,
    "Minnesota Twins": 202,
    "Houston Astros": 203,
    "Los Angeles Angels": 203,
    "Oakland Athletics": 203,
    "Seattle Mariners": 203,
    "Texas Rangers": 203,
    "Atlanta Braves": 204,
    "Miami Marlins": 204,
    "New York Mets": 204,
    "Philadelphia Phillies": 204,
    "Washington Nationals": 204,
    "Chicago Cubs": 205,
    "Cincinnati Reds": 205,
    "Milwaukee Brewers": 205,
    "Pittsburgh Pirates": 205,
    "St. Louis Cardinals": 205,
    "Arizona Diamondbacks": 206,
    "Colorado Rockies": 206,
    "Los Angeles Dodgers": 206,
    "San Diego Padres": 206,
    "San Francisco Giants": 206
  };

  const FAVORITE_KEY = "MY_FAV_TEAM";
  const DEFAULT_TEAM = "Milwaukee Brewers";
  const PAGE_ROUTES = {
    mlb: { label: "MLB", icon: "⚾", staticPath: "GameCards.html", dynamicPage: "games" },
    nfl: { label: "NFL", icon: "🏈", staticPath: "LeagueCards.html?sport=nfl", dynamicPage: "tv", sport: "nfl" },
    nba: { label: "NBA", icon: "🏀", staticPath: "LeagueCards.html?sport=nba", dynamicPage: "tv", sport: "nba" },
    pga: { label: "PGA", icon: "⛳", staticPath: "TVGuide.html?sport=pga", dynamicPage: "tv", sport: "pga" },
    atp: { label: "ATP", icon: "🎾", staticPath: "TVGuide.html?sport=atp", dynamicPage: "tv", sport: "atp" },
    wta: { label: "WTA", icon: "🎾", staticPath: "TVGuide.html?sport=wta", dynamicPage: "tv", sport: "wta" },
    news: { label: "Top News", icon: "📰", staticPath: "TopNews.html", dynamicPage: "news" },
    tv: { label: "TV", icon: "📺", staticPath: "TVGuide.html", dynamicPage: "tv" },
    home: { label: "Home", staticPath: "index.html", dynamicPage: "home" },
    games: { label: "Games", staticPath: "GameCards.html", dynamicPage: "games" },
    myteam: { label: "My Team", staticPath: "MyTeam.html", dynamicPage: "myteam" }
  };
  const SPORTS_NAV_ORDER = ["mlb", "nfl", "nba", "pga", "atp", "wta", "news", "tv"];
  const JSON_CACHE = new Map();

  function resolvePageKey(pageKey) {
    if (pageKey === "games" || pageKey === "home" || pageKey === "myteam") {
      return "mlb";
    }
    return PAGE_ROUTES[pageKey] ? pageKey : "mlb";
  }

  function resolveRouteKey(pageKey) {
    if (pageKey === "games" || pageKey === "home" || pageKey === "myteam") {
      return pageKey;
    }
    return PAGE_ROUTES[pageKey] ? pageKey : "mlb";
  }

  function getFavoriteTeam() {
    return localStorage.getItem(FAVORITE_KEY) || DEFAULT_TEAM;
  }

  function setFavoriteTeam(teamName) {
    if (teamName && TEAM_IDS[teamName]) {
      localStorage.setItem(FAVORITE_KEY, teamName);
    }
    return getFavoriteTeam();
  }

  function getTeamId(name) {
    return TEAM_IDS[name] || TEAM_IDS[DEFAULT_TEAM];
  }

  function getTeamNameById(teamId) {
    const target = Number(teamId);
    const names = Object.keys(TEAM_IDS);
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      if (Number(TEAM_IDS[name]) === target) {
        return name;
      }
    }
    return null;
  }

  function getDivisionId(teamName) {
    return DIVISION_IDS[teamName] || 205;
  }

  function toIsoDate(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  }

  function formatLocalTime(dateValue) {
    if (!dateValue) {
      return "Scheduled";
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return "Scheduled";
    }

    return parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatLeagueStatusText(statusType, startTime) {
    const state = statusType && statusType.state ? statusType.state : "pre";

    if (state === "pre") {
      return formatLocalTime(startTime);
    }

    if (state === "post") {
      return statusType && (statusType.shortDetail || statusType.detail || statusType.description)
        ? statusType.shortDetail || statusType.detail || statusType.description
        : "Final";
    }

    return statusType && (statusType.shortDetail || statusType.detail || statusType.description)
      ? statusType.shortDetail || statusType.detail || statusType.description
      : "Live";
  }

  function isAppsScriptWebApp() {
    const host = window.location.hostname.toLowerCase();
    if (
      host === "script.google.com" ||
      host.endsWith(".script.google.com") ||
      host === "script.googleusercontent.com" ||
      host.endsWith(".script.googleusercontent.com")
    ) {
      return true;
    }

    return !!(window.google && window.google.script && window.google.script.run);
  }

  function getScoresPageUrl(sport) {
    const sportKey = sport === "nfl" || sport === "nba" ? sport : "games";
    const resolvedKey = resolveRouteKey(sportKey);
    const route = PAGE_ROUTES[resolvedKey] || PAGE_ROUTES.mlb;

    if (!isAppsScriptWebApp()) {
      return route.staticPath;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("page", route.dynamicPage);
    if (route.sport) {
      url.searchParams.set("sport", route.sport);
    } else {
      url.searchParams.delete("sport");
    }
    return url.toString();
  }

  function getPageUrl(pageKey) {
    const resolvedKey = resolveRouteKey(pageKey);
    const route = PAGE_ROUTES[resolvedKey] || PAGE_ROUTES.mlb;

    if (!isAppsScriptWebApp()) {
      return route.staticPath;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("page", route.dynamicPage);
    if (route.sport) {
      url.searchParams.set("sport", route.sport);
    } else {
      url.searchParams.delete("sport");
    }
    return url.toString();
  }

  function navigateToPage(pageKey) {
    window.location.href = getPageUrl(pageKey);
  }

  function ensureNavStyles() {
    if (document.getElementById("mlb-site-nav-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "mlb-site-nav-style";
    style.textContent =
      "#siteNav{" +
      "position:sticky;top:0;z-index:1002;background:var(--bg,#f4f7f9);" +
      "}" +
      ".site-nav{" +
      "display:flex;justify-content:center;padding:6px 8px 2px;" +
      "}" +
      ".settings-bar{" +
      "top:34px;" +
      "}" +
      ".site-nav__rail{" +
      "display:flex;flex-wrap:nowrap;gap:4px;justify-content:flex-start;align-items:center;" +
      "background:rgba(0,70,173,0.08);border:1px solid rgba(0,70,173,0.14);" +
      "padding:2px 6px;border-radius:9px;backdrop-filter:blur(6px);" +
      "max-width:min(1100px,100%);overflow-x:auto;overflow-y:hidden;white-space:nowrap;" +
      "-webkit-overflow-scrolling:touch;scrollbar-width:thin;" +
      "}" +
      ".site-nav__link{" +
      "text-decoration:none;color:var(--navy,#0046ad);font-family:'Oswald',sans-serif;" +
      "font-size:0.66rem;letter-spacing:0.015em;text-transform:uppercase;font-weight:700;" +
      "padding:2px 3px;border-radius:5px;border:1px solid transparent;display:inline-flex;align-items:center;" +
      "transition:background-color 0.2s ease,color 0.2s ease,border-color 0.2s ease,transform 0.2s ease;" +
      "}" +
      ".site-nav__link:hover{" +
      "background:rgba(0,70,173,0.12);border-color:rgba(0,70,173,0.18);" +
      "}" +
      ".site-nav__link.is-active{" +
      "background:var(--navy,#0046ad);color:#fff;border-color:var(--navy,#0046ad);" +
      "}" +
      ".site-nav__sep{" +
      "font-family:'Roboto Mono',monospace;font-size:0.62rem;color:rgba(0,70,173,0.55);padding:0 1px;user-select:none;" +
      "}" +
      ".site-nav__sublink{" +
      "text-decoration:none;color:var(--navy,#0046ad);font-family:'Oswald',sans-serif;" +
      "font-size:0.66rem;letter-spacing:0.015em;text-transform:uppercase;font-weight:700;" +
      "padding:2px 3px;border-radius:5px;border:1px solid transparent;" +
      "background:transparent;transition:all 0.2s ease;" +
      "}" +
      ".site-nav__sublink:hover{background:rgba(0,70,173,0.1);border-color:rgba(0,70,173,0.18);}" +
      ".site-nav__sublink.is-active{background:var(--navy,#0046ad);color:#fff;border-color:var(--navy,#0046ad);}" +
      "@media (max-width: 600px){" +
      ".settings-bar{top:30px;}" +
      ".site-nav{padding:5px 6px 2px;}" +
      ".site-nav__rail{border-radius:7px;padding:2px 4px;gap:2px;}" +
      ".site-nav__link{font-size:0.62rem;padding:2px 3px;}" +
      ".site-nav__sublink{font-size:0.62rem;padding:2px 3px;}" +
      ".site-nav__sep{font-size:0.58rem;}" +
      "}";

    document.head.appendChild(style);
  }

  function renderSiteNav(currentPageKey, mountId) {
    ensureNavStyles();

    const mountNode = mountId ? document.getElementById(mountId) : null;
    const params = new URLSearchParams(window.location.search);
    const sportFromQuery = String(params.get("sport") || "").toLowerCase();
    const resolvedCurrent =
      currentPageKey === "myteam" && (sportFromQuery === "nfl" || sportFromQuery === "nba")
        ? sportFromQuery
        : resolvePageKey(currentPageKey);
    const onMyTeamPage = currentPageKey === "myteam";
    
    const linksHtml = SPORTS_NAV_ORDER
      .map(function (pageKey) {
        const route = PAGE_ROUTES[pageKey];
        const isActive = pageKey === resolvedCurrent;
        let href = getPageUrl(pageKey);
        
        // When on My Team page, clicking a sport should go to that sport's My Team page
        if (onMyTeamPage && (pageKey === "nfl" || pageKey === "nba")) {
          href = "MyTeam.html?sport=" + pageKey;
        } else if (onMyTeamPage && pageKey === "mlb") {
          href = "MyTeam.html";
        }
        
        return (
          '<a class="site-nav__link' +
          (isActive ? ' is-active' : '') +
          '" href="' +
          href +
          '"' +
          (isActive ? ' aria-current="page"' : '') +
          '>' +
          route.label +
          '</a>'
        );
      })
      .join('<span class="site-nav__sep" aria-hidden="true">/</span>');
    
    // Show My Team link only on scores pages (games, nfl, nba) and on My Team page itself
    const showMyTeamLink = currentPageKey === "games" || currentPageKey === "nfl" || currentPageKey === "nba" || currentPageKey === "myteam";
    
    // My Team link behavior:
    // - When on My Team page and clicking My Team, go to scores page for that sport
    // - When on scores page, go to My Team page
    let myTeamHref;
    if (onMyTeamPage) {
      // Currently on My Team - clicking it should go to scores page
      myTeamHref = getScoresPageUrl(resolvedCurrent);
    } else {
      // On scores page - clicking should go to My Team
      myTeamHref = resolvedCurrent === "nfl" || resolvedCurrent === "nba"
        ? "MyTeam.html?sport=" + resolvedCurrent
        : getPageUrl("myteam");
    }
    
    const myTeamIsActive = currentPageKey === "myteam";
    const subLinkHtml =
      showMyTeamLink
        ? '<span class="site-nav__sep" aria-hidden="true">/</span><a class="site-nav__sublink' +
          (myTeamIsActive ? ' is-active' : '') +
          '" href="' +
          myTeamHref +
          '">My Team</a>'
        : "";
    
    const navHtml =
      '<nav class="site-nav" aria-label="Sports"><div class="site-nav__rail">' + linksHtml + subLinkHtml + '</div></nav>';

    if (mountNode) {
      mountNode.innerHTML = navHtml;
      return;
    }

    document.body.insertAdjacentHTML("afterbegin", navHtml);
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Request failed: " + res.status + " " + res.statusText);
    }
    return await res.json();
  }

  async function fetchJsonCached(url, ttlMs) {
    const ttl = Number(ttlMs) > 0 ? Number(ttlMs) : 0;
    if (!ttl) {
      return fetchJson(url);
    }

    const now = Date.now();
    const cached = JSON_CACHE.get(url);
    if (cached && cached.data && cached.expiresAt > now) {
      return cached.data;
    }

    if (cached && cached.promise) {
      return cached.promise;
    }

    const pending = fetchJson(url)
      .then(function (data) {
        JSON_CACHE.set(url, {
          data: data,
          expiresAt: Date.now() + ttl,
          promise: null
        });
        return data;
      })
      .catch(function (error) {
        JSON_CACHE.delete(url);
        throw error;
      });

    JSON_CACHE.set(url, {
      data: null,
      expiresAt: now + ttl,
      promise: pending
    });

    return pending;
  }

  function isTodayIso(dateIso) {
    return String(dateIso || "") === toIsoDate(new Date());
  }

  function formatTripleSlash(value) {
    if (value === undefined || value === null || value === "") {
      return ".000";
    }

    const text = String(value);
    if (text === "-") {
      return ".000";
    }

    if (text.indexOf("0.") === 0) {
      return text.replace("0.", ".");
    }

    return text;
  }

  function toCompactPlayerName(fullName) {
    const text = String(fullName || "").trim();
    if (!text) {
      return "";
    }

    const tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) {
      return text;
    }

    const firstInitial = tokens[0].charAt(0).toUpperCase();
    const suffixes = { jr: true, sr: true, ii: true, iii: true, iv: true, v: true };
    const lastToken = tokens[tokens.length - 1];
    const lastTokenKey = lastToken.toLowerCase().replace(/\./g, "");

    if (suffixes[lastTokenKey] && tokens.length >= 3) {
      return firstInitial + ". " + tokens[tokens.length - 2] + " " + lastToken;
    }

    return firstInitial + ". " + lastToken;
  }

  function buildHittersFromTeam(teamData) {
    if (!teamData || !Array.isArray(teamData.batters) || !teamData.players) {
      return [];
    }

    const seenBattingSlots = {};

    return teamData.batters
      .map(function (id) {
        const p = teamData.players["ID" + id];
        if (!p || !p.person) {
          return null;
        }

        const battingOrderRaw = p.battingOrder ? String(p.battingOrder) : "";
        const battingOrderNum = battingOrderRaw ? parseInt(battingOrderRaw, 10) : NaN;
        const slot = Number.isNaN(battingOrderNum) ? null : Math.floor(battingOrderNum / 100);
        const isSubstitution = slot !== null && slot >= 1 && slot <= 9 && seenBattingSlots[slot] === true;

        if (slot !== null && slot >= 1 && slot <= 9) {
          seenBattingSlots[slot] = true;
        }

        const gameBatting = p.stats && p.stats.batting ? p.stats.batting : {};
        const seasonBatting = p.seasonStats && p.seasonStats.batting ? p.seasonStats.batting : {};

        return {
          id: p.person.id,
          name: toCompactPlayerName(p.person.fullName),
          position: p.position && p.position.abbreviation ? p.position.abbreviation : "-",
          battingSlot: slot,
          isSubstitution: isSubstitution,
          ab: gameBatting.atBats || 0,
          r: gameBatting.runs || 0,
          h: gameBatting.hits || 0,
          rbi: gameBatting.rbi || 0,
          hr: gameBatting.homeRuns || 0,
          bb: gameBatting.baseOnBalls || 0,
          k: gameBatting.strikeOuts || 0,
          avg: formatTripleSlash(seasonBatting.avg || gameBatting.avg || ".000"),
          obp: formatTripleSlash(seasonBatting.obp || gameBatting.obp || ".000"),
          slg: formatTripleSlash(seasonBatting.slg || gameBatting.slg || ".000")
        };
      })
      .filter(Boolean);
  }

  function buildPitchersFromTeam(teamData, decisions) {
    if (!teamData || !Array.isArray(teamData.pitchers) || !teamData.players) {
      return [];
    }

    return teamData.pitchers
      .map(function (id) {
        const p = teamData.players["ID" + id];
        if (!p || !p.person) {
          return null;
        }

        const gamePitching = p.stats && p.stats.pitching ? p.stats.pitching : {};
        const seasonPitching = p.seasonStats && p.seasonStats.pitching ? p.seasonStats.pitching : {};

        let decisionTag = "";
        if (decisions && decisions.winnerId && Number(decisions.winnerId) === Number(p.person.id)) {
          decisionTag = "W";
        } else if (decisions && decisions.loserId && Number(decisions.loserId) === Number(p.person.id)) {
          decisionTag = "L";
        } else if (decisions && decisions.saveId && Number(decisions.saveId) === Number(p.person.id)) {
          decisionTag = "S";
        }

        const pitchCount = gamePitching.numberOfPitches !== undefined ? gamePitching.numberOfPitches : "-";
        const strikes = gamePitching.strikes !== undefined ? gamePitching.strikes : "-";

        return {
          id: p.person.id,
          name: toCompactPlayerName(p.person.fullName),
          record: (seasonPitching.wins !== undefined && seasonPitching.losses !== undefined)
            ? seasonPitching.wins + "-" + seasonPitching.losses : null,
          saves: seasonPitching.saves !== undefined ? seasonPitching.saves : null,
          decisionTag: decisionTag,
          ip: gamePitching.inningsPitched || "0.0",
          h: gamePitching.hits || 0,
          r: gamePitching.runs || 0,
          er: gamePitching.earnedRuns || 0,
          bb: gamePitching.baseOnBalls || 0,
          k: gamePitching.strikeOuts || 0,
          hr: gamePitching.homeRuns || 0,
          pcst: pitchCount + "-" + strikes,
          era: seasonPitching.era || gamePitching.era || "0.00"
        };
      })
      .filter(Boolean);
  }

  function buildTeamPitchingTotals(teamData) {
    const teamPitching = teamData && teamData.teamStats && teamData.teamStats.pitching ? teamData.teamStats.pitching : {};
    const pitchCount = teamPitching.numberOfPitches !== undefined ? teamPitching.numberOfPitches : "-";
    const strikes = teamPitching.strikes !== undefined ? teamPitching.strikes : "-";

    return {
      ip: teamPitching.inningsPitched || "0.0",
      h: teamPitching.hits || 0,
      r: teamPitching.runs || 0,
      er: teamPitching.earnedRuns || 0,
      bb: teamPitching.baseOnBalls || 0,
      k: teamPitching.strikeOuts || 0,
      hr: teamPitching.homeRuns || 0,
      pcst: pitchCount + "-" + strikes
    };
  }

  function buildTeamInfoLines(teamData, sectionTitle) {
    if (!teamData || !Array.isArray(teamData.info)) {
      return [];
    }

    const section = teamData.info.find(function (infoBlock) {
      return infoBlock && String(infoBlock.title || "").toLowerCase() === sectionTitle;
    });

    if (!section || !Array.isArray(section.fieldList)) {
      return [];
    }

    return section.fieldList
      .map(function (field) {
        if (!field) {
          return "";
        }
        if (field.label && field.value) {
          return String(field.label).trim() + ": " + String(field.value).trim();
        }
        return String(field.value || field.label || "").trim();
      })
      .filter(Boolean);
  }

  function normalizeNoteEntry(entry) {
    if (entry === undefined || entry === null) {
      return "";
    }

    if (typeof entry === "string" || typeof entry === "number") {
      return String(entry).trim();
    }

    if (typeof entry === "object") {
      if (entry.label && entry.value) {
        return String(entry.label).trim() + ": " + String(entry.value).trim();
      }

      if (entry.title && Array.isArray(entry.fieldList)) {
        return entry.fieldList
          .map(function (field) {
            if (!field) {
              return "";
            }
            if (field.label && field.value) {
              return String(field.label).trim() + ": " + String(field.value).trim();
            }
            return String(field.value || field.label || "").trim();
          })
          .filter(Boolean)
          .join("; ");
      }

      if (entry.text) {
        return String(entry.text).trim();
      }

      if (entry.value) {
        return String(entry.value).trim();
      }
    }

    return "";
  }

  function buildTeamNotes(teamData) {
    const pitchingNotes = Array.isArray(teamData && teamData.note)
      ? teamData.note
          .map(function (line) {
            return normalizeNoteEntry(line);
          })
          .filter(Boolean)
      : [];

    return {
      batting: buildTeamInfoLines(teamData, "batting"),
      baserunning: buildTeamInfoLines(teamData, "baserunning"),
      fielding: buildTeamInfoLines(teamData, "fielding"),
      pitching: pitchingNotes
    };
  }

  async function enrichLiveData(gameObj, gameRaw) {
    try {
      const boxscoreUrl = "https://statsapi.mlb.com/api/v1/game/" + gameRaw.gamePk + "/boxscore";
      const boxData = await fetchJson(boxscoreUrl);
      const teams = boxData.teams || {};

      const awayBatters = teams.away && Array.isArray(teams.away.batters) ? teams.away.batters.slice(0, 9) : [];
      const homeBatters = teams.home && Array.isArray(teams.home.batters) ? teams.home.batters.slice(0, 9) : [];

      gameObj.awayLineup = awayBatters
        .map(function (id) {
          const p = teams.away && teams.away.players ? teams.away.players["ID" + id] : null;
          return p ? { name: toCompactPlayerName(p.person.fullName), position: (p.position && p.position.abbreviation) || "?" } : null;
        })
        .filter(Boolean);

      gameObj.homeLineup = homeBatters
        .map(function (id) {
          const p = teams.home && teams.home.players ? teams.home.players["ID" + id] : null;
          return p ? { name: toCompactPlayerName(p.person.fullName), position: (p.position && p.position.abbreviation) || "?" } : null;
        })
        .filter(Boolean);

      const innings = gameRaw.linescore && Array.isArray(gameRaw.linescore.innings) ? gameRaw.linescore.innings : [];
      gameObj.linescoreInnings = innings.map(function (inning, idx) {
        return {
          inning: idx + 1,
          away: inning.away && inning.away.runs !== undefined ? inning.away.runs : "-",
          home: inning.home && inning.home.runs !== undefined ? inning.home.runs : "-"
        };
      });

      gameObj.awayTotals = {
        r:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.away && gameRaw.linescore.teams.away.runs !== undefined
            ? gameRaw.linescore.teams.away.runs
            : gameObj.awayScore,
        h:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.away && gameRaw.linescore.teams.away.hits !== undefined
            ? gameRaw.linescore.teams.away.hits
            : "-",
        e:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.away && gameRaw.linescore.teams.away.errors !== undefined
            ? gameRaw.linescore.teams.away.errors
            : "-"
      };

      gameObj.homeTotals = {
        r:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.home && gameRaw.linescore.teams.home.runs !== undefined
            ? gameRaw.linescore.teams.home.runs
            : gameObj.homeScore,
        h:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.home && gameRaw.linescore.teams.home.hits !== undefined
            ? gameRaw.linescore.teams.home.hits
            : "-",
        e:
          gameRaw.linescore && gameRaw.linescore.teams && gameRaw.linescore.teams.home && gameRaw.linescore.teams.home.errors !== undefined
            ? gameRaw.linescore.teams.home.errors
            : "-"
      };

      gameObj.awayHitters = buildHittersFromTeam(teams.away);
      gameObj.homeHitters = buildHittersFromTeam(teams.home);
      gameObj.awayPitchers = buildPitchersFromTeam(teams.away, gameObj);
      gameObj.homePitchers = buildPitchersFromTeam(teams.home, gameObj);
      gameObj.awayPitchingTotals = buildTeamPitchingTotals(teams.away);
      gameObj.homePitchingTotals = buildTeamPitchingTotals(teams.home);
      gameObj.awayNotes = buildTeamNotes(teams.away);
      gameObj.homeNotes = buildTeamNotes(teams.home);

      // Look up starter season records from boxscore player map
      function getStarterRecord(teamData, starterId) {
        if (!starterId || !teamData || !teamData.players) return null;
        const p = teamData.players["ID" + starterId];
        const sp = p && p.seasonStats && p.seasonStats.pitching;
        return (sp && sp.wins !== undefined && sp.losses !== undefined) ? sp.wins + "-" + sp.losses : null;
      }
      gameObj.awayStarterRecord = getStarterRecord(teams.away, gameObj.awayStarterId);
      gameObj.homeStarterRecord = getStarterRecord(teams.home, gameObj.homeStarterId);

      if (gameObj.status !== "Live") {
        return;
      }

      const isTopInning = gameRaw.linescore && gameRaw.linescore.isTopInning;
      const pitchingTeam = isTopInning ? teams.home : teams.away;
      const battingTeam = isTopInning ? teams.away : teams.home;

      if (pitchingTeam && Array.isArray(pitchingTeam.pitchers) && pitchingTeam.pitchers.length > 0) {
        const currentPitcherId = pitchingTeam.pitchers[pitchingTeam.pitchers.length - 1];
        const pitcher = pitchingTeam.players ? pitchingTeam.players["ID" + currentPitcherId] : null;
        if (pitcher) {
          gameObj.currentPitcher = toCompactPlayerName(pitcher.person.fullName);
          const pitchingStats = pitcher.stats && pitcher.stats.pitching;
          if (pitchingStats) {
            gameObj.pitchCount = pitchingStats.numberOfPitches || null;
            gameObj.pitchSummary = pitchingStats.summary || null;
          }
        }
      }

      if (gameRaw.linescore) {
        gameObj.outs = gameRaw.linescore.outs || 0;
        gameObj.runnerOn1 = !!(gameRaw.linescore.offense && gameRaw.linescore.offense.first);
        gameObj.runnerOn2 = !!(gameRaw.linescore.offense && gameRaw.linescore.offense.second);
        gameObj.runnerOn3 = !!(gameRaw.linescore.offense && gameRaw.linescore.offense.third);
        if (gameRaw.linescore.balls !== undefined && gameRaw.linescore.strikes !== undefined) {
          gameObj.ballStrikeCount = "B:" + gameRaw.linescore.balls + " S:" + gameRaw.linescore.strikes;
        }
      }

      if (battingTeam && Array.isArray(battingTeam.batters) && battingTeam.batters.length > 0) {
        let currentBatter = null;
        for (let i = 0; i < battingTeam.batters.length; i += 1) {
          const batter = battingTeam.players ? battingTeam.players["ID" + battingTeam.batters[i]] : null;
          if (batter && batter.gameStatus && batter.gameStatus.isCurrentBatter) {
            currentBatter = batter;
            break;
          }
        }

        if (currentBatter) {
          gameObj.currentBatter = toCompactPlayerName(currentBatter.person.fullName);
          const gameBatting = currentBatter.stats && currentBatter.stats.batting;
          const gameHits = gameBatting ? gameBatting.hits || 0 : null;
          const gameAtBats = gameBatting ? gameBatting.atBats || 0 : null;
          gameObj.batterLine = gameHits !== null && gameAtBats !== null ? gameHits + "-" + gameAtBats : "-";

          let seasonAvg = null;
          if (currentBatter.seasonStats && currentBatter.seasonStats.batting && currentBatter.seasonStats.batting.avg) {
            seasonAvg = currentBatter.seasonStats.batting.avg;
          } else if (gameBatting && gameBatting.avg) {
            seasonAvg = gameBatting.avg;
          }
          gameObj.batterAvg = seasonAvg ? String(seasonAvg).replace("0.", ".") : ".000";
        }
      }
    } catch (error) {
      console.warn("Unable to enrich game data", error);
    }
  }

  function transformMlbGame(game, teamId) {
    const linescore = game.linescore;
    const detailedState = game.status && game.status.detailedState ? String(game.status.detailedState) : "Scheduled";
    const codedState = game.status && game.status.codedGameState ? String(game.status.codedGameState) : "";
    const isInProgress = codedState === "I" || detailedState === "In Progress";
    let liveText = detailedState;

    if (isInProgress) {
      if (linescore && linescore.currentInning) {
        const inningState = linescore.inningState ? String(linescore.inningState).toLowerCase() : "";
        if (inningState.indexOf("middle") === 0) {
          liveText = "MID " + linescore.currentInning;
        } else if (inningState.indexOf("end") === 0) {
          liveText = "END " + linescore.currentInning;
        } else {
          liveText = (linescore.isTopInning ? "TOP " : "BOT ") + linescore.currentInning;
        }
      } else {
        liveText = "LIVE";
      }
    } else if (detailedState.toLowerCase() === "warmup") {
      liveText = "WARMUP";
    } else if (game.status && game.status.abstractGameState === "Preview") {
      liveText = new Date(game.gameDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    const tvList = (game.broadcasts || [])
      .filter(function (b) {
        return b.type === "TV";
      })
      .map(function (b) {
        return b.name || b.callSign;
      });

    return {
      gameId: game.gamePk,
      status: game.status ? game.status.abstractGameState : "Preview",
      liveText: liveText,
      away: game.teams.away.team.name,
      awayId: game.teams.away.team.id,
      awayRecord:
        game.teams.away && game.teams.away.leagueRecord
          ? String(game.teams.away.leagueRecord.wins || 0) + "-" + String(game.teams.away.leagueRecord.losses || 0)
          : "",
      awayScore: game.teams.away.score || 0,
      home: game.teams.home.team.name,
      homeId: game.teams.home.team.id,
      homeRecord:
        game.teams.home && game.teams.home.leagueRecord
          ? String(game.teams.home.leagueRecord.wins || 0) + "-" + String(game.teams.home.leagueRecord.losses || 0)
          : "",
      homeScore: game.teams.home.score || 0,
      awayStarter: game.teams.away.probablePitcher ? toCompactPlayerName(game.teams.away.probablePitcher.fullName) : "TBD",
      awayStarterId: game.teams.away.probablePitcher ? game.teams.away.probablePitcher.id : null,
      awayStarterRecord: null,
      homeStarter: game.teams.home.probablePitcher ? toCompactPlayerName(game.teams.home.probablePitcher.fullName) : "TBD",
      homeStarterId: game.teams.home.probablePitcher ? game.teams.home.probablePitcher.id : null,
      homeStarterRecord: null,
      currentPitcher: null,
      currentBatter: null,
      pitchCount: null,
      pitchSummary: null,
      batterLine: null,
      batterAvg: null,
      ballStrikeCount: null,
      outs: 0,
      runnerOn1: false,
      runnerOn2: false,
      runnerOn3: false,
      winner: game.decisions && game.decisions.winner ? toCompactPlayerName(game.decisions.winner.fullName) : "N/A",
      winnerId: game.decisions && game.decisions.winner ? game.decisions.winner.id || null : null,
      loser: game.decisions && game.decisions.loser ? toCompactPlayerName(game.decisions.loser.fullName) : "N/A",
      loserId: game.decisions && game.decisions.loser ? game.decisions.loser.id || null : null,
      save: game.decisions && game.decisions.save ? toCompactPlayerName(game.decisions.save.fullName) : "N/A",
      saveId: game.decisions && game.decisions.save ? game.decisions.save.id || null : null,
      tv: tvList.length > 0 ? tvList.slice(0, 2).join(", ") : "N/A",
      umpire: "TBD",
      venue: game.venue && game.venue.name ? game.venue.name : "Ballpark",
      fav: game.teams.away.team.id === teamId || game.teams.home.team.id === teamId ? 0 : 1,
      awayLineup: [],
      homeLineup: [],
      awayHitters: [],
      homeHitters: [],
      awayPitchers: [],
      homePitchers: [],
      awayPitchingTotals: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, pcst: "-" },
      homePitchingTotals: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, pcst: "-" },
      awayNotes: { batting: [], baserunning: [], fielding: [], pitching: [] },
      homeNotes: { batting: [], baserunning: [], fielding: [], pitching: [] },
      linescoreInnings: [],
      awayTotals: { r: game.teams.away.score || 0, h: "-", e: "-" },
      homeTotals: { r: game.teams.home.score || 0, h: "-", e: "-" }
    };
  }

  async function getDashboardData(targetDateStr) {
    const myTeam = getFavoriteTeam();
    const teamId = getTeamId(myTeam);
    const dateIso = targetDateStr || toIsoDate(new Date());

    const response = {
      myTeam: myTeam,
      currentDateIso: dateIso,
      games: []
    };

    const scheduleUrl =
      "https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate=" +
      dateIso +
      "&endDate=" +
      dateIso +
      "&hydrate=team,lineups,decisions,broadcasts,probablePitcher,linescore";

    const sched = await fetchJson(scheduleUrl);
    if (!sched.dates || sched.dates.length === 0) {
      return response;
    }

    const rawGames = sched.dates[0].games || [];
    const transformed = rawGames.map(function (g) {
      return transformMlbGame(g, teamId);
    });

    await Promise.all(
      transformed.map(function (gameObj, idx) {
        return enrichLiveData(gameObj, rawGames[idx]);
      })
    );

    transformed.sort(function (a, b) {
      return a.fav - b.fav;
    });

    response.games = transformed;
    return response;
  }

  function ordinal(value) {
    const remainder10 = value % 10;
    const remainder100 = value % 100;
    if (remainder10 === 1 && remainder100 !== 11) {
      return value + "st";
    }
    if (remainder10 === 2 && remainder100 !== 12) {
      return value + "nd";
    }
    if (remainder10 === 3 && remainder100 !== 13) {
      return value + "rd";
    }
    return value + "th";
  }

  function getStandingContext(myTeam, standings) {
    if (!standings || standings.length === 0) {
      return null;
    }

    const teamIndex = standings.findIndex(function (entry) {
      return entry && entry.name === myTeam;
    });

    if (teamIndex === -1) {
      return null;
    }

    const entry = standings[teamIndex];
    const gbValue = entry.gb === undefined || entry.gb === null || entry.gb === "" ? "-" : entry.gb;

    return {
      place: ordinal(teamIndex + 1),
      wins: entry.w,
      losses: entry.l,
      gamesBack: gbValue,
      streak: entry.streak || "-"
    };
  }

  function buildStandingsSentence(myTeam, standings) {
    const context = getStandingContext(myTeam, standings);
    if (!context) {
      return "";
    }

    const gbText = String(context.gamesBack) === "0" ? "lead the division" : "sit " + context.gamesBack + " games back";
    return (
      myTeam +
      " are " +
      context.place +
      " in the division at " +
      context.wins +
      "-" +
      context.losses +
      " and " +
      gbText +
      ", carrying a " +
      context.streak +
      " streak."
    );
  }

  function buildNextGameSentence(upcoming) {
    if (!upcoming || upcoming.length === 0) {
      return "";
    }

    const nextGame = upcoming[0];
    return "Next up: " + nextGame.opponent + " on " + nextGame.date + " at " + nextGame.time + ".";
  }

  function buildLiveSituationSentence(teamGame) {
    const pieces = [];

    if (teamGame.currentBatter) {
      let batterText = teamGame.currentBatter;
      if (teamGame.batterAvg && teamGame.batterLine) {
        batterText += " (" + teamGame.batterAvg + ", " + teamGame.batterLine + ")";
      }
      pieces.push("Current hitter: " + batterText);
    }

    if (teamGame.currentPitcher) {
      let pitcherText = teamGame.currentPitcher;
      if (teamGame.pitchSummary) {
        pitcherText += " [" + teamGame.pitchSummary + "]";
      }
      pieces.push("Pitcher: " + pitcherText);
    }

    if (teamGame.ballStrikeCount) {
      pieces.push("Count " + teamGame.ballStrikeCount.replace("B:", "").replace(" S:", "-") + ".");
    }

    return pieces.join(" ");
  }

  function buildAiText(teamGame, myTeam, standings, upcoming) {
    const standingsSentence = buildStandingsSentence(myTeam, standings);
    const nextGameSentence = buildNextGameSentence(upcoming);

    if (!teamGame) {
      return {
        aiLabel: "Team Insight",
        aiReport: [
          standingsSentence || (myTeam + " have an off day on the selected date."),
          nextGameSentence || "Use the day off to watch the division race and probable pitching setup for the next series."
        ].join(" ").trim()
      };
    }

    const myTeamIsAway = teamGame.away === myTeam;
    const opponent = myTeamIsAway ? teamGame.home : teamGame.away;
    const myScore = myTeamIsAway ? teamGame.awayScore : teamGame.homeScore;
    const oppScore = myTeamIsAway ? teamGame.homeScore : teamGame.awayScore;
    const myStarter = myTeamIsAway ? teamGame.awayStarter : teamGame.homeStarter;
    const oppStarter = myTeamIsAway ? teamGame.homeStarter : teamGame.awayStarter;

    if (teamGame.status === "Final") {
      const didWin = myScore > oppScore;
      const margin = Math.abs(myScore - oppScore);
      return {
        aiLabel: "Game Recap",
        aiReport: [
          myTeam +
            (didWin ? " beat " : " fell to ") +
            opponent +
            " " +
            myScore +
            "-" +
            oppScore +
            (margin > 1 ? ", a " + margin + "-run decision." : "."),
          standingsSentence || "",
          nextGameSentence || ""
        ].join(" ").trim()
      };
    }

    if (teamGame.status === "Live") {
      return {
        aiLabel: "Live Snapshot",
        aiReport: [
          myTeam +
            " are " +
            teamGame.liveText +
            " against " +
            opponent +
            " at " +
            teamGame.venue +
            ", with the score " +
            myScore +
            "-" +
            oppScore +
            ".",
          buildLiveSituationSentence(teamGame),
          standingsSentence || ""
        ].join(" ").trim()
      };
    }

    return {
      aiLabel: teamGame.gameDateLabel ? "Next Matchup" : "Matchup Insight",
      aiReport: [
        myTeam +
          " draw " +
          opponent +
          " at " +
          teamGame.venue +
          ", with " +
          myStarter +
          " lined up against " +
          oppStarter +
          ".",
        teamGame.tv && teamGame.tv !== "N/A" ? "TV coverage: " + teamGame.tv + "." : "",
        standingsSentence || nextGameSentence || ""
      ].join(" ").trim()
    };
  }

  async function getMyTeamData(targetDateStr) {
    const myTeam = getFavoriteTeam();
    const teamId = getTeamId(myTeam);
    const dateIso = targetDateStr || toIsoDate(new Date());
    const currentYear = new Date().getFullYear();

    let dashboardData = { games: [] };
    try {
      dashboardData = await getDashboardData(dateIso);
    } catch (error) {
      console.warn("Unable to fetch schedule data", error);
    }

    let teamGame = null;
    for (let i = 0; i < dashboardData.games.length; i += 1) {
      const g = dashboardData.games[i];
      if (g.awayId === teamId || g.homeId === teamId) {
        teamGame = g;
        break;
      }
    }

    if (!teamGame) {
      try {
        const lookaheadUrl =
          "https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=" +
          teamId +
          "&startDate=" +
          dateIso +
          "&endDate=" +
          currentYear +
          "-11-01&limit=1&hydrate=team,probablePitcher,broadcasts";
        const lookRes = await fetchJson(lookaheadUrl);
        if (lookRes.dates && lookRes.dates[0] && lookRes.dates[0].games && lookRes.dates[0].games[0]) {
          const nextRaw = lookRes.dates[0].games[0];
          teamGame = transformMlbGame(nextRaw, teamId);
          teamGame.gameDateLabel =
            "Next Game: " +
            new Date(nextRaw.gameDate).toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric"
            });
        }
      } catch (error) {
        console.warn("Unable to fetch lookahead game", error);
      }
    }

    let standings = [];
    try {
      const divisionId = getDivisionId(myTeam);
      const standUrl =
        "https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=" +
        currentYear +
        "&standingsTypes=regularSeason";
      const standData = await fetchJson(standUrl);
      const records = standData.records || [];
      let division = records.find(function (r) {
        return r.division && Number(r.division.id) === Number(divisionId);
      });

      // Fallback: find the record set that actually contains the favorite team.
      if (!division) {
        division = records.find(function (r) {
          return (r.teamRecords || []).some(function (tr) {
            return tr.team && Number(tr.team.id) === Number(teamId);
          });
        });
      }

      // Last-resort fallback prevents a blank table when API grouping is unexpected.
      if (!division && records.length > 0) {
        division = records[0];
      }

      if (division) {
        standings = (division.teamRecords || []).map(function (tr) {
          return {
            name: tr.team.name,
            w: tr.wins,
            l: tr.losses,
            gb: tr.divisionGamesBack || tr.gamesBack || "-",
            streak: tr.streak && tr.streak.streakCode ? tr.streak.streakCode : "-",
            isMe: tr.team.id === teamId
          };
        });
      }
    } catch (error) {
      console.warn("Unable to fetch standings", error);
    }

    let upcoming = [];
    try {
      const nextDay = new Date(dateIso + "T00:00:00");
      nextDay.setDate(nextDay.getDate() + 1);
      const startIso = toIsoDate(nextDay);

      const upUrl =
        "https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=" +
        teamId +
        "&startDate=" +
        startIso +
        "&endDate=" +
        currentYear +
        "-11-01&limit=5";
      const upData = await fetchJson(upUrl);

      (upData.dates || []).forEach(function (d) {
        (d.games || []).forEach(function (g) {
          if (upcoming.length >= 5) {
            return;
          }
          const isAway = g.teams.away.team.id === teamId;
          upcoming.push({
            date: new Date(g.gameDate).toLocaleDateString([], { month: "short", day: "numeric" }),
            opponent: (isAway ? "@ " : "vs ") + (isAway ? g.teams.home.team.name : g.teams.away.team.name),
            time: new Date(g.gameDate).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          });
        });
      });
    } catch (error) {
      console.warn("Unable to fetch upcoming games", error);
    }

    const aiContent = buildAiText(teamGame, myTeam, standings, upcoming);

    if (teamGame) {
      teamGame.awayTeamLineup = teamGame.awayLineup || [];
      teamGame.homeTeamLineup = teamGame.homeLineup || [];
    }

    return {
      myTeam: myTeam,
      currentDateIso: dateIso,
      teamGame: teamGame,
      standings: standings,
      upcoming: upcoming,
      aiLabel: aiContent.aiLabel,
      aiReport: aiContent.aiReport
    };
  }

  async function getRosterData(teamRef) {
    let myTeam = getFavoriteTeam();
    let teamId = getTeamId(myTeam);

    if (teamRef !== undefined && teamRef !== null && teamRef !== "") {
      const teamRefText = String(teamRef);
      if (/^\d+$/.test(teamRefText)) {
        teamId = Number(teamRefText);
        myTeam = getTeamNameById(teamId) || myTeam;
      } else if (TEAM_IDS[teamRefText]) {
        myTeam = teamRefText;
        teamId = getTeamId(myTeam);
      }
    }

    const rosterUrl = "https://statsapi.mlb.com/api/v1/teams/" + teamId + "/roster?rosterType=40Man";
    const rosterRes = await fetchJson(rosterUrl);

    const roster = {
      teamName: myTeam,
      teamId: teamId,
      inf: [],
      out: [],
      cat: [],
      pit: [],
      il: []
    };

    (rosterRes.roster || []).forEach(function (p) {
      const player = {
        number: p.jerseyNumber || "--",
        name: toCompactPlayerName(p.person.fullName || "").toUpperCase()
      };

      const posType = p.position && p.position.type ? p.position.type : "";
      if (p.status && p.status.code !== "A") {
        roster.il.push(player);
      } else if (posType === "Pitcher") {
        roster.pit.push(player);
      } else if (posType === "Catcher") {
        roster.cat.push(player);
      } else if (posType === "Infielder") {
        roster.inf.push(player);
      } else if (posType === "Outfielder") {
        roster.out.push(player);
      }
    });

    return roster;
  }

  async function getLeagueScoreboardData(leagueKey, dateIso) {
    const leagueMap = {
      nfl: { sport: "football", league: "nfl", label: "NFL" },
      nba: { sport: "basketball", league: "nba", label: "NBA" }
    };

    const key = String(leagueKey || "").toLowerCase();
    const config = leagueMap[key];
    if (!config) {
      throw new Error("Unsupported league: " + leagueKey);
    }

    let dateParam = "";
    if (dateIso) {
      dateParam = String(dateIso).replace(/-/g, "");
    } else {
      dateParam = toIsoDate(new Date()).replace(/-/g, "");
    }

    const url =
      "https://site.api.espn.com/apis/site/v2/sports/" +
      config.sport +
      "/" +
      config.league +
      "/scoreboard?dates=" +
      dateParam;

    const data = await fetchJsonCached(url, isTodayIso(dateParam.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")) ? 10000 : 300000);
    const events = data.events || [];

    const games = events.map(function (ev) {
      const competition = ev.competitions && ev.competitions[0] ? ev.competitions[0] : {};
      const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];

      let away = null;
      let home = null;
      competitors.forEach(function (c) {
        const side = c && c.homeAway;
        const normalized = {
          name: c && c.team ? c.team.displayName || c.team.shortDisplayName || "Team" : "Team",
          abbr: c && c.team ? c.team.abbreviation || "" : "",
          logo: c && c.team && c.team.logo ? c.team.logo : "",
          score: c && c.score !== undefined ? c.score : "0",
          record:
            c && Array.isArray(c.records) && c.records[0] && c.records[0].summary
              ? c.records[0].summary
              : ""
        };

        if (side === "home") {
          home = normalized;
        } else if (side === "away") {
          away = normalized;
        }
      });

      const broadcasts = Array.isArray(competition.broadcasts) ? competition.broadcasts : [];
      const network = broadcasts.length > 0 && broadcasts[0].names ? broadcasts[0].names.join(", ") : "N/A";

      const statusType = ev.status && ev.status.type ? ev.status.type : {};
      const state = statusType.state || "pre";

      return {
        id: ev.id,
        name: ev.shortName || "Matchup",
        startTime: ev.date,
        statusShort: formatLeagueStatusText(statusType, ev.date),
        statusState: state,
        venue: competition.venue && competition.venue.fullName ? competition.venue.fullName : "",
        network: network,
        away: away || { name: "Away", abbr: "", logo: "", score: "0", record: "" },
        home: home || { name: "Home", abbr: "", logo: "", score: "0", record: "" }
      };
    });

    return {
      leagueKey: key,
      leagueLabel: config.label,
      currentDateIso: dateParam.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      games: games
    };
  }

  function normalizeLeagueCompetitor(competitor) {
    if (!competitor) {
      return {
        id: "",
        name: "Team",
        shortName: "Team",
        abbr: "",
        logo: "",
        score: "0",
        record: "",
        teamColor: "",
        alternateColor: "",
        homeAway: "",
        winner: false,
        linescores: []
      };
    }

    const team = competitor.team || {};

    return {
      id: team.id || "",
      name: team.displayName || team.shortDisplayName || "Team",
      shortName: team.shortDisplayName || team.displayName || "Team",
      abbr: team.abbreviation || "",
      logo: resolveTeamLogo(team),
      score: competitor.score !== undefined ? competitor.score : "0",
      record:
        Array.isArray(competitor.records) && competitor.records[0] && competitor.records[0].summary
          ? competitor.records[0].summary
          : "",
      teamColor: team.color ? "#" + String(team.color).replace(/^#/, "") : "",
      alternateColor: team.alternateColor ? "#" + String(team.alternateColor).replace(/^#/, "") : "",
      homeAway: competitor.homeAway || "",
      winner: competitor.winner === true,
      linescores: Array.isArray(competitor.linescores)
        ? competitor.linescores.map(function (line, index) {
            return {
              period: line.period !== undefined ? line.period : index + 1,
              value: line.displayValue || line.value || "-"
            };
          })
        : []
    };
  }

  function resolveTeamLogo(team) {
    if (!team) {
      return "";
    }

    if (team.logo) {
      return team.logo;
    }

    const logos = Array.isArray(team.logos) ? team.logos : [];
    if (!logos.length) {
      return "";
    }

    const scoreboardLogo = logos.find(function (entry) {
      return Array.isArray(entry && entry.rel) && entry.rel.indexOf("scoreboard") !== -1 && entry.href;
    });
    if (scoreboardLogo && scoreboardLogo.href) {
      return scoreboardLogo.href;
    }

    const defaultLogo = logos.find(function (entry) {
      return Array.isArray(entry && entry.rel) && entry.rel.indexOf("default") !== -1 && entry.href;
    });
    if (defaultLogo && defaultLogo.href) {
      return defaultLogo.href;
    }

    return logos[0] && logos[0].href ? logos[0].href : "";
  }

  function humanizeStatKey(key) {
    const raw = String(key || "").trim();
    if (!raw) {
      return "";
    }

    return raw
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\bpct\b/i, "%")
      .replace(/\bfg\b/gi, "FG")
      .replace(/\bft\b/gi, "FT")
      .replace(/\bast\b/gi, "AST")
      .replace(/\breb\b/gi, "REB")
      .replace(/\bstl\b/gi, "STL")
      .replace(/\bblk\b/gi, "BLK")
      .replace(/\bto\b/gi, "TO")
      .replace(/\boreb\b/gi, "OREB")
      .replace(/\bdreb\b/gi, "DREB")
      .replace(/\b3 pt\b/gi, "3PT")
      .replace(/(^|\s)([a-z])/g, function (_, lead, char) {
        return lead + char.toUpperCase();
      });
  }

  function normalizeStatSection(section) {
    const headersSource = Array.isArray(section && section.labels) && section.labels.length > 0
      ? section.labels
      : Array.isArray(section && section.names) && section.names.length > 0
        ? section.names
        : section && section.keys
          ? section.keys
          : [];
    const descriptions = Array.isArray(section && section.descriptions) ? section.descriptions : [];
    const headers = headersSource.map(function (header, index) {
      const label = header || descriptions[index] || "";
      return String(label || "").trim() || humanizeStatKey(section && section.keys ? section.keys[index] : "");
    });

    const athletes = Array.isArray(section && section.athletes) ? section.athletes : [];
    const rows = athletes.map(function (athleteEntry) {
      const athlete = athleteEntry && athleteEntry.athlete ? athleteEntry.athlete : {};
      const jersey = athlete.jersey ? " #" + athlete.jersey : "";
      const position = athlete.position && athlete.position.abbreviation ? athlete.position.abbreviation : "";
      const stats = Array.isArray(athleteEntry && athleteEntry.stats) ? athleteEntry.stats : [];
      let statusText = "";

      if ((!stats || stats.length === 0) && athleteEntry) {
        statusText = athleteEntry.reason || athleteEntry.comment || athleteEntry.displayValue || athleteEntry.note || "";
      }

      return {
        name: toCompactPlayerName(athlete.displayName || "Player") + jersey,
        position: position,
        values: stats,
        statusText: statusText
      };
    });

    return {
      title: section && (section.displayName || section.label || section.name) ? String(section.displayName || section.label || section.name).toUpperCase() : "STATS",
      headers: headers,
      rows: rows,
      totals: Array.isArray(section && section.totals) ? section.totals : []
    };
  }

  function normalizeLeaderGroups(leaders) {
    return (Array.isArray(leaders) ? leaders : []).map(function (group) {
      const team = group && group.team ? group.team : {};
      const items = Array.isArray(group && group.leaders)
        ? group.leaders.map(function (category) {
            const entry = Array.isArray(category && category.leaders) && category.leaders[0] ? category.leaders[0] : {};
            const athlete = entry && entry.athlete ? entry.athlete : {};
            const headshot = athlete && athlete.headshot ? athlete.headshot.href || athlete.headshot : "";
            return {
              label: category && (category.displayName || category.name) ? String(category.displayName || category.name) : "Leader",
              athleteName: toCompactPlayerName(athlete.displayName || athlete.shortName || entry.displayValue || "Leader"),
              value: entry && entry.mainStat ? [entry.mainStat.value || "", entry.mainStat.label || ""].filter(Boolean).join(" ") : entry.displayValue || entry.value || "",
              summary: entry.summary || "",
              teamAbbr: team.abbreviation || "",
              teamLogo: resolveTeamLogo(team),
              image: headshot
            };
          })
        : [];

      return {
        title: (team.displayName || team.shortDisplayName || group && (group.displayName || group.name) || "Leaders").toUpperCase(),
        teamAbbr: team.abbreviation || "",
        teamLogo: resolveTeamLogo(team),
        items: items
      };
    });
  }

  function normalizeTeamStatBlocks(teamBlocks) {
    return (Array.isArray(teamBlocks) ? teamBlocks : []).map(function (teamBlock) {
      const team = teamBlock && teamBlock.team ? teamBlock.team : {};
      return {
        team: {
          name: team.displayName || team.shortDisplayName || "Team",
          abbr: team.abbreviation || "",
          logo: resolveTeamLogo(team),
          color: team.color ? "#" + String(team.color).replace(/^#/, "") : ""
        },
        stats: Array.isArray(teamBlock && teamBlock.statistics)
          ? teamBlock.statistics.map(function (entry) {
              return {
                label:
                  entry && (entry.label || entry.displayName || entry.abbreviation)
                    ? entry.label || entry.displayName || entry.abbreviation
                    : humanizeStatKey(entry && entry.name ? entry.name : "Stat"),
                value: entry && entry.displayValue !== undefined ? entry.displayValue : entry && entry.value !== undefined ? entry.value : ""
              };
            })
          : []
      };
    });
  }

  function normalizeOfficials(officials) {
    return (Array.isArray(officials) ? officials : []).map(function (official) {
      return {
        name: official && official.fullName ? official.fullName : official && official.displayName ? official.displayName : "Official",
        role: official && (official.position || official.type) ? official.position || official.type : ""
      };
    });
  }

  function normalizeBroadcasts(broadcasts) {
    return (Array.isArray(broadcasts) ? broadcasts : []).map(function (broadcast) {
      if (Array.isArray(broadcast && broadcast.names) && broadcast.names.length) {
        return broadcast.names.join(", ");
      }
      const market = broadcast && broadcast.market ? broadcast.market.type || broadcast.market.name || "" : "";
      const media = broadcast && broadcast.media ? broadcast.media.shortName || broadcast.media.name || "" : "";
      const label = [market, media].filter(Boolean).join(": ");
      return label || broadcast && broadcast.name ? broadcast.name : "";
    }).filter(Boolean);
  }

  function normalizeOdds(odds) {
    const primary = Array.isArray(odds) && odds[0] ? odds[0] : null;
    if (!primary) {
      return null;
    }

    return {
      details: primary.details || "",
      overUnder: primary.overUnder || "",
      provider: primary.provider && primary.provider.name ? primary.provider.name : ""
    };
  }

  function normalizeSituation(situation) {
    if (!situation) {
      return null;
    }

    return {
      downDistanceText: situation.downDistanceText || "",
      lastPlayText: situation.lastPlay && situation.lastPlay.text ? situation.lastPlay.text : "",
      possessionText:
        situation.possession && situation.possession.abbreviation
          ? situation.possession.abbreviation + " ball"
          : ""
    };
  }

  function buildPeriodLabels(leagueKey, awayLines, homeLines) {
    const count = Math.max(awayLines.length, homeLines.length, leagueKey === "nfl" ? 4 : 4);
    const labels = [];
    for (let i = 0; i < count; i++) {
      if (leagueKey === "nfl") {
        labels.push(i < 4 ? "Q" + (i + 1) : "OT" + (i === 4 ? "" : i - 3));
      } else {
        labels.push(i < 4 ? String(i + 1) : "OT" + (i === 4 ? "" : i - 3));
      }
    }
    return labels;
  }

  function normalizePlayerBoxes(playerBlocks) {
    return (Array.isArray(playerBlocks) ? playerBlocks : []).map(function (teamBlock) {
      const team = teamBlock && teamBlock.team ? teamBlock.team : {};
      return {
        team: {
          name: team.displayName || team.shortDisplayName || "Team",
          abbr: team.abbreviation || "",
          logo: resolveTeamLogo(team),
          color: team.color ? "#" + String(team.color).replace(/^#/, "") : ""
        },
        sections: Array.isArray(teamBlock && teamBlock.statistics)
          ? teamBlock.statistics.map(function (section) {
              return normalizeStatSection(section);
            })
          : []
      };
    });
  }

  async function getLeagueGameDetails(leagueKey, gameId) {
    const leagueMap = {
      nba: { sport: "basketball", league: "nba", label: "NBA" },
      nfl: { sport: "football", league: "nfl", label: "NFL" }
    };

    const key = String(leagueKey || "").toLowerCase();
    const config = leagueMap[key];
    if (!config) {
      throw new Error("Unsupported game details league: " + leagueKey);
    }

    const url =
      "https://site.api.espn.com/apis/site/v2/sports/" +
      config.sport +
      "/" +
      config.league +
      "/summary?event=" +
      encodeURIComponent(gameId);

    const data = await fetchJsonCached(url, 15000);
    const headerCompetition = data && data.header && Array.isArray(data.header.competitions) ? data.header.competitions[0] : {};
    const competitors = Array.isArray(headerCompetition && headerCompetition.competitors) ? headerCompetition.competitors : [];

    let away = null;
    let home = null;
    competitors.forEach(function (competitor) {
      if (competitor && competitor.homeAway === "away") {
        away = normalizeLeagueCompetitor(competitor);
      }
      if (competitor && competitor.homeAway === "home") {
        home = normalizeLeagueCompetitor(competitor);
      }
    });

    const boxscorePlayers = data && data.boxscore && Array.isArray(data.boxscore.players) ? data.boxscore.players : [];
    const teamBoxes = normalizePlayerBoxes(boxscorePlayers);
    const teamStats = normalizeTeamStatBlocks(data && data.boxscore ? data.boxscore.teams : []);
    const venue = headerCompetition && headerCompetition.venue ? headerCompetition.venue : {};
    const broadcasts = normalizeBroadcasts(headerCompetition && headerCompetition.broadcasts);
    const attendance = headerCompetition && headerCompetition.attendance ? headerCompetition.attendance : data && data.gameInfo ? data.gameInfo.attendance : "";

    return {
      leagueKey: key,
      leagueLabel: config.label,
      gameId: gameId,
      statusDetail:
        headerCompetition && headerCompetition.status && headerCompetition.status.type
          ? formatLeagueStatusText(
              headerCompetition.status.type,
              headerCompetition.date || (data && data.header ? data.header.date : "")
            )
          : "Game",
      venue: venue && venue.fullName ? venue.fullName : "",
      city: venue && venue.address ? [venue.address.city || "", venue.address.state || ""].filter(Boolean).join(", ") : "",
      attendance: attendance || "",
      broadcasts: broadcasts,
      odds: normalizeOdds(data && data.odds),
      situation: normalizeSituation(data && data.situation),
      officials: normalizeOfficials(data && data.officials),
      leaders: normalizeLeaderGroups(data && data.leaders),
      periodLabels: buildPeriodLabels(key, away ? away.linescores : [], home ? home.linescores : []),
      away: away || normalizeLeagueCompetitor(null),
      home: home || normalizeLeagueCompetitor(null),
      teamBoxes: teamBoxes,
      teamStats: teamStats
    };
  }

  async function getTvGuideData() {
    const leagues = [
      { sport: "baseball", league: "mlb", label: "MLB" },
      { sport: "basketball", league: "nba", label: "NBA" },
      { sport: "hockey", league: "nhl", label: "NHL" },
      { sport: "football", league: "nfl", label: "NFL" },
      { sport: "basketball", league: "mens-college-basketball", label: "NCAA" }
    ];

    const today = toIsoDate(new Date()).replace(/-/g, "");
    const allGames = [];

    await Promise.all(
      leagues.map(async function (l) {
        try {
          const url =
            "https://site.api.espn.com/apis/site/v2/sports/" +
            l.sport +
            "/" +
            l.league +
            "/scoreboard?dates=" +
            today;
          const data = await fetchJsonCached(url, 60000);

          (data.events || []).forEach(function (ev) {
            const competition = ev.competitions && ev.competitions[0] ? ev.competitions[0] : null;
            const broadcasts = competition && competition.broadcasts ? competition.broadcasts : [];
            const network = broadcasts.length > 0 && broadcasts[0].names ? broadcasts[0].names.join(", ") : "N/A";

            allGames.push({
              league: l.label,
              name: ev.shortName || "Matchup",
              time: ev.date,
              network: network,
              status: ev.status && ev.status.type ? ev.status.type.shortDetail : "Scheduled"
            });
          });
        } catch (error) {
          console.warn("Unable to fetch league", l.label, error);
        }
      })
    );

    allGames.sort(function (a, b) {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    return allGames;
  }

  async function getPgaLastTournamentLeaderboard() {
    const today = new Date();
    const maxLookbackDays = 60;

    for (let i = 0; i <= maxLookbackDays; i += 1) {
      const probeDate = new Date(today.getTime());
      probeDate.setDate(today.getDate() - i);
      const dateKey = toIsoDate(probeDate).replace(/-/g, "");
      const url =
        "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=" +
        dateKey;

      let payload;
      try {
        payload = await fetchJsonCached(url, 3600000);
      } catch (error) {
        continue;
      }

      const events = Array.isArray(payload && payload.events) ? payload.events : [];
      if (!events.length) {
        continue;
      }

      const completed = events.find(function (event) {
        return event && event.status && event.status.type && event.status.type.state === "post";
      });

      if (!completed || !Array.isArray(completed.competitions) || !completed.competitions.length) {
        continue;
      }

      const comp = completed.competitions[0] || {};
      const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
      if (!competitors.length) {
        continue;
      }

      const leaderboard = competitors
        .slice()
        .sort(function (a, b) {
          const ao = Number(a && a.order !== undefined ? a.order : 9999);
          const bo = Number(b && b.order !== undefined ? b.order : 9999);
          return ao - bo;
        })
        .map(function (c, idx) {
          const athlete = c && c.athlete ? c.athlete : {};
          const rounds = Array.isArray(c && c.linescores) ? c.linescores : [];
          const roundText = rounds
            .map(function (r) {
              return r && r.displayValue !== undefined ? String(r.displayValue) : "-";
            })
            .join(" / ");

          const scoreRaw = c && c.score !== undefined && c.score !== null ? String(c.score) : "";
          const scoreText = scoreRaw === "0" ? "E" : (scoreRaw || "-");

          return {
            id: c && c.id !== undefined && c.id !== null ? String(c.id) : String(idx + 1),
            pos: c && c.order !== undefined && c.order !== null ? String(c.order) : String(idx + 1),
            name: toCompactPlayerName(athlete.displayName || athlete.shortName || "Unknown"),
            fullName: toCompactPlayerName(athlete.fullName || athlete.displayName || athlete.shortName || "Unknown"),
            flag: athlete && athlete.flag && athlete.flag.href ? athlete.flag.href : "",
            toPar: scoreText,
            rounds: roundText || "-",
            roundData: rounds.map(function (round) {
              const holes = Array.isArray(round && round.linescores) ? round.linescores : [];
              return {
                period: round && round.period !== undefined ? Number(round.period) : 0,
                score: round && round.displayValue !== undefined ? String(round.displayValue) : "-",
                strokes: round && round.value !== undefined && round.value !== null ? Number(round.value) : null,
                holes: holes.map(function (hole) {
                  const scoreType = hole && hole.scoreType && hole.scoreType.displayValue !== undefined
                    ? String(hole.scoreType.displayValue)
                    : "";
                  return {
                    hole: hole && hole.period !== undefined ? Number(hole.period) : 0,
                    strokes: hole && hole.displayValue !== undefined ? String(hole.displayValue) : "-",
                    relativeToPar: scoreType
                  };
                })
              };
            })
          };
        });

      const eventDate = completed.date ? new Date(completed.date) : null;
      const eventDateLabel = eventDate && !Number.isNaN(eventDate.getTime())
        ? eventDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })
        : "";

      return {
        eventName: completed.shortName || completed.name || "Latest PGA Tournament",
        eventDate: eventDateLabel,
        status: completed.status && completed.status.type && completed.status.type.description
          ? completed.status.type.description
          : "Final",
        leaderboard: leaderboard
      };
    }

    return {
      eventName: "Latest PGA Tournament",
      eventDate: "",
      status: "Unavailable",
      leaderboard: []
    };
  }

  async function getPgaLastTournamentTop25() {
    const data = await getPgaLastTournamentLeaderboard();
    return {
      eventName: data.eventName,
      eventDate: data.eventDate,
      status: data.status,
      top25: Array.isArray(data.leaderboard) ? data.leaderboard.slice(0, 25) : []
    };
  }

  async function getTopNewsData(limitPerSport) {
    const limit = Number(limitPerSport) > 0 ? Number(limitPerSport) : 5;
    const leagueFeeds = [
      { key: "mlb", label: "MLB", sport: "baseball", league: "mlb" },
      { key: "nfl", label: "NFL", sport: "football", league: "nfl" },
      { key: "nba", label: "NBA", sport: "basketball", league: "nba" },
      { key: "pga", label: "PGA", sport: "golf", league: "pga" },
      { key: "atp", label: "ATP", sport: "tennis", league: "atp" },
      { key: "wta", label: "WTA", sport: "tennis", league: "wta" }
    ];

    const results = await Promise.all(
      leagueFeeds.map(async function (feed) {
        try {
          const url =
            "https://site.api.espn.com/apis/site/v2/sports/" +
            feed.sport +
            "/" +
            feed.league +
            "/news";
          const payload = await fetchJsonCached(url, 300000);
          const articles = (Array.isArray(payload && payload.articles) ? payload.articles : [])
            .slice(0, limit)
            .map(function (article) {
              const links = article && article.links ? article.links : {};
              const images = Array.isArray(article && article.images) ? article.images : [];
              const image = images[0] || {};

              return {
                id: article && (article.id || article.guid) ? article.id || article.guid : "",
                headline: article && article.headline ? article.headline : "Top Story",
                description: article && article.description ? article.description : "",
                published: article && article.published ? article.published : "",
                image: image.url || "",
                source: article && article.source ? article.source : "ESPN",
                link:
                  links && links.web && links.web.href
                    ? links.web.href
                    : links && links.mobile && links.mobile.href
                      ? links.mobile.href
                      : ""
              };
            });

          return {
            key: feed.key,
            label: feed.label,
            articles: articles,
            error: ""
          };
        } catch (error) {
          return {
            key: feed.key,
            label: feed.label,
            articles: [],
            error: error && error.message ? error.message : String(error)
          };
        }
      })
    );

    return results;
  }

  window.MLBClient = {
    getFavoriteTeam: getFavoriteTeam,
    setFavoriteTeam: setFavoriteTeam,
    getDashboardData: getDashboardData,
    getMyTeamData: getMyTeamData,
    getRosterData: getRosterData,
    getLeagueScoreboardData: getLeagueScoreboardData,
    getLeagueGameDetails: getLeagueGameDetails,
    getTopNewsData: getTopNewsData,
    getTvGuideData: getTvGuideData,
    getPgaLastTournamentLeaderboard: getPgaLastTournamentLeaderboard,
    getPgaLastTournamentTop25: getPgaLastTournamentTop25,
    getTeamId: getTeamId,
    getPageUrl: getPageUrl,
    navigateToPage: navigateToPage,
    renderSiteNav: renderSiteNav
  };
})();
