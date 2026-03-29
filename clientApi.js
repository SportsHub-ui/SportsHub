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
    home: { label: "Home", staticPath: "index.html", dynamicPage: "home" },
    games: { label: "Games", staticPath: "GameCards.html", dynamicPage: "games" },
    myteam: { label: "My Team", staticPath: "MyTeam.html", dynamicPage: "myteam" },
    roster: { label: "Roster", staticPath: "Roster.html", dynamicPage: "roster" },
    tv: { label: "TV Guide", staticPath: "TVGuide.html", dynamicPage: "tv" }
  };

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

  function getDivisionId(teamName) {
    return DIVISION_IDS[teamName] || 205;
  }

  function toIsoDate(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
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

  function getPageUrl(pageKey) {
    const route = PAGE_ROUTES[pageKey] || PAGE_ROUTES.games;

    if (!isAppsScriptWebApp()) {
      return route.staticPath;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("page", route.dynamicPage);
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
      ".site-nav{" +
      "display:flex;justify-content:center;padding:16px 16px 8px;" +
      "}" +
      ".site-nav__rail{" +
      "display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;" +
      "background:rgba(0,70,173,0.08);border:1px solid rgba(0,70,173,0.12);" +
      "padding:10px 12px;border-radius:999px;backdrop-filter:blur(6px);" +
      "}" +
      ".site-nav__link{" +
      "text-decoration:none;color:var(--navy,#0046ad);font-family:'Oswald',sans-serif;" +
      "font-size:0.95rem;letter-spacing:0.03em;text-transform:uppercase;font-weight:700;" +
      "padding:8px 14px;border-radius:999px;border:1px solid transparent;" +
      "transition:background-color 0.2s ease,color 0.2s ease,border-color 0.2s ease,transform 0.2s ease;" +
      "}" +
      ".site-nav__link:hover{" +
      "background:rgba(0,70,173,0.12);border-color:rgba(0,70,173,0.18);transform:translateY(-1px);" +
      "}" +
      ".site-nav__link.is-active{" +
      "background:var(--navy,#0046ad);color:#fff;border-color:var(--navy,#0046ad);" +
      "}" +
      "@media (max-width: 600px){" +
      ".site-nav{padding:12px 12px 6px;}" +
      ".site-nav__rail{border-radius:18px;padding:10px;gap:8px;}" +
      ".site-nav__link{font-size:0.82rem;padding:7px 10px;}" +
      "}";

    document.head.appendChild(style);
  }

  function renderSiteNav(currentPageKey, mountId) {
    ensureNavStyles();

    const mountNode = mountId ? document.getElementById(mountId) : null;
    const linksHtml = Object.keys(PAGE_ROUTES)
      .map(function (pageKey) {
        const route = PAGE_ROUTES[pageKey];
        const isActive = pageKey === currentPageKey;
        return (
          '<a class="site-nav__link' +
          (isActive ? ' is-active' : '') +
          '" href="' +
          getPageUrl(pageKey) +
          '"' +
          (isActive ? ' aria-current="page"' : '') +
          '>' +
          route.label +
          '</a>'
        );
      })
      .join("");
    const navHtml = '<nav class="site-nav" aria-label="Site"><div class="site-nav__rail">' + linksHtml + '</div></nav>';

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
          return p ? { name: p.person.fullName, position: (p.position && p.position.abbreviation) || "?" } : null;
        })
        .filter(Boolean);

      gameObj.homeLineup = homeBatters
        .map(function (id) {
          const p = teams.home && teams.home.players ? teams.home.players["ID" + id] : null;
          return p ? { name: p.person.fullName, position: (p.position && p.position.abbreviation) || "?" } : null;
        })
        .filter(Boolean);

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
          gameObj.currentPitcher = pitcher.person.fullName;
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
          gameObj.currentBatter = currentBatter.person.fullName;
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
    let liveText = game.status && game.status.detailedState ? game.status.detailedState : "Scheduled";

    if (game.status && (game.status.abstractGameState === "Live" || game.status.detailedState === "In Progress")) {
      if (linescore && linescore.currentInning) {
        liveText = (linescore.isTopInning ? "TOP " : "BOT ") + linescore.currentInning;
      } else {
        liveText = "LIVE";
      }
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
      awayScore: game.teams.away.score || 0,
      home: game.teams.home.team.name,
      homeId: game.teams.home.team.id,
      homeScore: game.teams.home.score || 0,
      awayStarter: game.teams.away.probablePitcher ? game.teams.away.probablePitcher.fullName : "TBD",
      homeStarter: game.teams.home.probablePitcher ? game.teams.home.probablePitcher.fullName : "TBD",
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
      winner: game.decisions && game.decisions.winner ? game.decisions.winner.fullName : "N/A",
      loser: game.decisions && game.decisions.loser ? game.decisions.loser.fullName : "N/A",
      tv: tvList.length > 0 ? tvList.slice(0, 2).join(", ") : "N/A",
      umpire: "TBD",
      venue: game.venue && game.venue.name ? game.venue.name : "Ballpark",
      fav: game.teams.away.team.id === teamId || game.teams.home.team.id === teamId ? 0 : 1,
      awayLineup: [],
      homeLineup: []
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

  async function getRosterData() {
    const myTeam = getFavoriteTeam();
    const teamId = getTeamId(myTeam);
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
        name: (p.person.fullName || "").toUpperCase()
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
          const data = await fetchJson(url);

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

  window.MLBClient = {
    getFavoriteTeam: getFavoriteTeam,
    setFavoriteTeam: setFavoriteTeam,
    getDashboardData: getDashboardData,
    getMyTeamData: getMyTeamData,
    getRosterData: getRosterData,
    getTvGuideData: getTvGuideData,
    getTeamId: getTeamId,
    getPageUrl: getPageUrl,
    navigateToPage: navigateToPage,
    renderSiteNav: renderSiteNav
  };
})();
