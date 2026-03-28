
/**
 * MLB Dashboard Controller - CSR Version
 * NO GOOGLE SHEETS VERSION
 */

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page.toLowerCase() : "dashboard";

  if (page === "roster") {
    return HtmlService.createTemplateFromFile('Roster').evaluate().setTitle("Team Roster").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (page === "tv") {
    return HtmlService.createTemplateFromFile('TVGuide').evaluate().setTitle("Sports TV Guide").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (page === "myteam") {
    return HtmlService.createTemplateFromFile('MyTeam').evaluate().setTitle("My Team").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createTemplateFromFile('GameCards').evaluate().setTitle("MLB Board").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * SETTINGS: PropertiesService handles the "Database"
 */
function getFavoriteTeam() {
  // Returns saved team or default to Brewers
  return PropertiesService.getUserProperties().getProperty('MY_FAV_TEAM') || "Milwaukee Brewers";
}

function setFavoriteTeam(teamName) {
  PropertiesService.getUserProperties().setProperty('MY_FAV_TEAM', teamName);
  // Clear any existing cache for this user so the change is immediate
  CacheService.getUserCache().removeAll(['dashboard_data', 'myteam_data']);
  return "Success";
}

/**
 * DATA PROVIDER
 */
/**
 * REFACTORED getAppData: No Sheets, Pure Cache/Properties
 */

function getAppData(currentPage = "dashboard", targetDateStr = null) {
  const cache = CacheService.getUserCache();
  const userProps = PropertiesService.getUserProperties();
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  const myTeam = userProps.getProperty('MY_FAV_TEAM') || "Milwaukee Brewers";
  const tId = getTeamId(myTeam);
  const timezone = Session.getScriptTimeZone();
  const currentYear = new Date().getFullYear();

  let teamGame = null;
  let schedRes = null;

  // 1. DETERMINE SEARCH DATE
  let searchDate = new Date();
  if (targetDateStr) {
    const parts = targetDateStr.split('-');
    searchDate = new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const dateString = Utilities.formatDate(searchDate, timezone, "yyyy-MM-dd");

  const response = {
    myTeam: myTeam,
    displayDate: Utilities.formatDate(searchDate, timezone, "EEEE, MMMM d"),
    currentDateIso: dateString,
    games: []
  };


  // 2. FETCH ALL GAMES (For Dashboard or finding MyTeam's game today)
  try {
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&startDate=${dateString}&endDate=${dateString}&hydrate=team,lineups,decisions,broadcasts,probablePitcher,linescore`;

    schedRes = JSON.parse(UrlFetchApp.fetch(scheduleUrl).getContentText());

    if (schedRes.dates && schedRes.dates.length > 0) {

      response.games = schedRes.dates[0].games.map((g, index) => {
        const isMyTeam = (g.teams.away.team.id == tId || g.teams.home.team.id == tId);
        const gameObj = transformMlbGame(g, timezone, tId);

        // Fetch boxscore data for pitcher/batter info AND starting lineup
        try {
          const boxscoreUrl = `https://statsapi.mlb.com/api/v1/game/${g.gamePk}/boxscore`;
          const boxRes = UrlFetchApp.fetch(boxscoreUrl, { muteHttpExceptions: true });
          if (boxRes.getResponseCode() === 200) {
            const boxData = JSON.parse(boxRes.getContentText());
            const teams = boxData.teams;

            // Extract starting lineups (batters array is in batting order)
            if (teams.away?.batters && teams.away.batters.length > 0) {
              gameObj.awayLineup = teams.away.batters.slice(0, 9).map(batterId => {
                const batter = teams.away.players["ID" + batterId];
                return batter ? { name: batter.person.fullName, position: batter.position?.abbreviation || "?" } : null;
              }).filter(p => p !== null);
            }

            if (teams.home?.batters && teams.home.batters.length > 0) {
              gameObj.homeLineup = teams.home.batters.slice(0, 9).map(batterId => {
                const batter = teams.home.players["ID" + batterId];
                return batter ? { name: batter.person.fullName, position: batter.position?.abbreviation || "?" } : null;
              }).filter(p => p !== null);
            }

            // Only extract current pitcher/batter for live games
            if (gameObj.status === "Live") {
              const isTopInning = g.linescore?.isTopInning;
              const pitchingTeam = isTopInning ? teams.home : teams.away;
              const battingTeam = isTopInning ? teams.away : teams.home;

              // Extract pitcher info
              if (pitchingTeam?.pitchers && pitchingTeam.pitchers.length > 0) {
                const currentPitcherId = pitchingTeam.pitchers[pitchingTeam.pitchers.length - 1];
                const pitcher = pitchingTeam.players["ID" + currentPitcherId];
                if (pitcher) {
                  gameObj.currentPitcher = pitcher.person.fullName;
                  if (pitcher.stats?.pitching) {
                    const pitchStats = pitcher.stats.pitching;
                    gameObj.pitchCount = pitchStats.numberOfPitches || null;
                    gameObj.pitchSummary = pitchStats.summary || null;
                  }
                }
              }

              // Extract ball/strike count from linescore
              if (g.linescore?.balls !== undefined && g.linescore?.strikes !== undefined) {
                gameObj.ballStrikeCount = g.linescore.balls + "-" + g.linescore.strikes;
              }

              // Extract batter info - find the actual current batter in the array
              if (battingTeam?.batters && battingTeam.batters.length > 0) {
                // Find the batter where isCurrentBatter is true
                let currentBatter = null;
                for (let batterId of battingTeam.batters) {
                  const batter = battingTeam.players["ID" + batterId];
                  if (batter && batter.gameStatus?.isCurrentBatter) {
                    currentBatter = batter;
                    break;
                  }
                }

                if (currentBatter) {
                  gameObj.currentBatter = currentBatter.person.fullName;

                  // Access seasonStats.batting directly (not an array)
                  const battingStats = currentBatter.seasonStats?.batting || currentBatter.stats?.batting;

                  if (battingStats && Object.keys(battingStats).length > 0) {
                    const hits = battingStats.hits || 0;
                    const atBats = battingStats.atBats || 0;

                    gameObj.batterLine = hits + "-" + atBats;

                    if (atBats > 0) {
                      gameObj.batterAvg = (hits / atBats).toFixed(3).substring(1);
                    } else if (battingStats.avg) {
                      gameObj.batterAvg = battingStats.avg.toString().replace('0.', '.');
                    } else {
                      gameObj.batterAvg = ".000";
                    }
                  }
                }
              }
            }
          }
        } catch (boxErr) {
          console.error("Boxscore fetch error: " + boxErr);
        }

        if (isMyTeam) teamGame = gameObj;
        return gameObj;
      });
      response.games.sort((a, b) => a.fav - b.fav);
    }
  } catch (err) {
    console.error("Schedule Fetch Error: " + err);
  }

  // 3. IF NO GAME FOUND FOR MY TEAM TODAY (And we are on the MyTeam page), FIND THE NEXT ONE
  if (currentPage === "myteam" && !teamGame) {
    try {
      const lookaheadUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${tId}&startDate=${dateString}&endDate=${currentYear}-11-01&limit=1&hydrate=team,probablePitcher,broadcasts`;
      const lookRes = JSON.parse(UrlFetchApp.fetch(lookaheadUrl).getContentText());
      if (lookRes.dates && lookRes.dates[0] && lookRes.dates[0].games[0]) {
        const nextG = lookRes.dates[0].games[0];
        teamGame = transformMlbGame(nextG, timezone, tId);
        // Add a label so the UI knows this is a future game
        teamGame.gameDateLabel = "Next Game: " + Utilities.formatDate(new Date(nextG.gameDate), timezone, "EEEE, MMM d");
      }
    } catch (e) { console.error("Lookahead Error: " + e); }
  }

  // 4. MY TEAM PAGE EXTRA DATA
  if (currentPage === "myteam") {
    response.teamGame = teamGame;

    // STANDINGS
    try {
      const divId = getDivisionId(myTeam);
      const standUrl = `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${currentYear}&standingsTypes=regularSeason`;
      const standData = JSON.parse(UrlFetchApp.fetch(standUrl).getContentText());
      let division = standData.records.find(r => r.division.id == divId);
      if (division) {
        response.standings = division.teamRecords.map(tr => ({
          name: tr.team.name, w: tr.wins, l: tr.losses, gb: tr.divisionGamesBack,
          streak: tr.streak?.streakCode || "-", isMe: tr.team.id == tId
        }));
      }
    } catch (e) { console.error("Standings Error: " + e); }

    // UPCOMING (Next 5)
    try {
      const upStart = new Date(searchDate);
      upStart.setDate(upStart.getDate() + 1);
      const upUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${tId}&startDate=${Utilities.formatDate(upStart, timezone, "yyyy-MM-dd")}&endDate=${currentYear}-11-01&limit=5`;
      const upData = JSON.parse(UrlFetchApp.fetch(upUrl).getContentText());
      response.upcoming = [];
      if (upData.dates) {
        upData.dates.forEach(d => {
          d.games.forEach(g => {
            if (response.upcoming.length < 5) {
              const isAway = g.teams.away.team.id == tId;
              response.upcoming.push({
                date: Utilities.formatDate(new Date(g.gameDate), timezone, "MMM d"),
                opponent: (isAway ? "@ " : "vs ") + (isAway ? g.teams.home.team.name : g.teams.away.team.name),
                time: Utilities.formatDate(new Date(g.gameDate), timezone, "h:mm a")
              });
            }
          });
        });
      }
    } catch (e) { console.error("Upcoming Games Error: " + e); }

    // AI REPORT
    if (teamGame) {
      response.aiReport = (teamGame.status === "Final")
        ? getPostGameSummary(teamGame, apiKey)
        : getGeminiScoutReport(teamGame, apiKey);
      response.aiLabel = (teamGame.status === "Final") ? "AI Game Recap" : "Gemini Scout Analysis";

      // Pass lineups from boxscore data (already extracted in the games loop)
      if (response.teamGame) {
        response.teamGame.awayTeamLineup = response.teamGame.awayLineup || [];
        response.teamGame.homeTeamLineup = response.teamGame.homeLineup || [];
      }
    } else {
      response.aiReport = getGeminiTeamReport(myTeam, apiKey);
      response.aiLabel = "Team Insight";
    }
  }

  return response;
}

/**
 * HELPER: Cleanup Game Data Mapping
 */
function transformMlbGame(g, timezone, tId) {
  const ls = g.linescore;
  let inningDisplay = g.status.detailedState;
  if (g.status.abstractGameState === "Live" || g.status.detailedState === "In Progress") {
    inningDisplay = (ls && ls.currentInning) ? (ls.isTopInning ? "TOP " : "BOT ") + ls.currentInning : "LIVE";
  } else if (g.status.abstractGameState === "Preview") {
    inningDisplay = Utilities.formatDate(new Date(g.gameDate), timezone, "h:mm a");
  }

  const tv = (g.broadcasts || []).filter(b => b.type === 'TV').map(b => b.name);

  // Extract home plate umpire
  const hpUmpire = (g.officials || []).find(o => o.officialType === 'Home Plate');
  const umpireName = hpUmpire?.official?.fullName || "TBD";

  // Extract winning and losing pitchers for completed games
  const winnerPitcher = g.decisions?.winner?.fullName || "N/A";
  const loserPitcher = g.decisions?.loser?.fullName || "N/A";

  // Extract current pitcher and batter from boxscore if available
  let currentPitcher = null;
  let currentBatter = null;
  let pitchCount = null;
  let pitchSummary = null;
  let batterLine = null;
  let batterAvg = null;
  let ballStrikeCount = null;

  return {
    gameId: g.gamePk,
    status: g.status.abstractGameState,
    liveText: inningDisplay,
    away: g.teams.away.team.name,
    awayId: g.teams.away.team.id,
    awayScore: g.teams.away.score || 0,
    home: g.teams.home.team.name,
    homeId: g.teams.home.team.id,
    homeScore: g.teams.home.score || 0,
    awayStarter: g.teams.away.probablePitcher?.fullName || "TBD",
    homeStarter: g.teams.home.probablePitcher?.fullName || "TBD",
    currentPitcher: currentPitcher,
    currentBatter: currentBatter,
    pitchCount: pitchCount,
    pitchSummary: pitchSummary,
    batterLine: batterLine,
    batterAvg: batterAvg,
    ballStrikeCount: ballStrikeCount,
    winner: winnerPitcher,
    loser: loserPitcher,
    tv: tv.length > 0 ? tv.slice(0, 2).join(', ') : "N/A",
    umpire: umpireName,
    venue: g.venue?.name || "Ballpark",
    fav: (g.teams.away.team.id == tId || g.teams.home.team.id == tId) ? 0 : 1
  };
}

/**
 * ROSTER FETCH (Added to fix your Roster.html)
 */
function getRosterData() {
  const myTeam = getFavoriteTeam();
  const teamId = getTeamId(myTeam);
  const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=40Man`;
  const res = JSON.parse(UrlFetchApp.fetch(url).getContentText());

  const roster = { teamName: myTeam, teamId: teamId, inf: [], out: [], cat: [], pit: [], il: [] };

  (res.roster || []).forEach(p => {
    const player = { number: p.jerseyNumber || "--", name: p.person.fullName.toUpperCase() };
    const type = p.position.type;
    if (p.status?.code !== 'A') roster.il.push(player);
    else if (type === 'Pitcher') roster.pit.push(player);
    else if (type === 'Catcher') roster.cat.push(player);
    else if (type === 'Infielder') roster.inf.push(player);
    else if (type === 'Outfielder') roster.out.push(player);
  });
  return roster;
}

// ... Keep your getGeminiScoutReport, getPostGameSummary, getTeamId, getDivisionId helpers ...


/**
* AI Post-Game Summary Helper
*/
function getPostGameSummary(game, apiKey) {
  const cache = CacheService.getUserCache();
  const cacheKey = "ai_summary_" + game.gameId;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    //const prompt = `Summarize this MLB game result in 2 professional, sporty sentences: 
    const prompt = `Summarize this MLB game result in 2 funny, silly sentences. Add a sentence about a strange play in the game: 
        The ${game.away} scored ${game.awayScore} and the ${game.home} scored ${game.homeScore}. 
        Winner: ${game.winner || 'N/A'}, Loser: ${game.loser || 'N/A'}.`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;
    const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
    const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload) };

    const res = UrlFetchApp.fetch(url, options);
    const aiText = JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
    cache.put(cacheKey, aiText, 21600);
    return aiText;
  } catch (e) {
    return "Post-game summary is currently unavailable.";
  }
}

/**
 * AI Scouting Report Helper
 */
function getGeminiScoutReport(game, apiKey) {
  const cache = CacheService.getUserCache();
  const cacheKey = "ai_scout_" + game.gameId;
  const cachedReport = cache.get(cacheKey);
  if (cachedReport) return cachedReport;

  try {
    const prompt = `Give a 2-sentence scouting report for this MLB game: ${game.away} (${game.awayStarter}) vs ${game.home} (${game.homeStarter}). Mention one key factor for a win. Keep it professional and sporty.`;
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

    const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
    const options = { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload) };

    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());
    const aiText = json.candidates[0].content.parts[0].text;
    cache.put(cacheKey, aiText, 14400);
    return aiText;
  } catch (e) {
    return "Scouting report unavailable.";
  }
}


/**
 * AI Scouting Report Helper
 */
function getGeminiTeamReport(team, apiKey) {
  const cache = CacheService.getUserCache();
  // Remove spaces from the team name for a safe cache key
  // Using todays date in the key so we get a new summary every day
  const today = new Date();
  const timezone = Session.getScriptTimeZone(); // Or use "GMT", "EST", etc.
  const formattedDate = Utilities.formatDate(today, timezone, "yyyyMMdd");
  const cacheKey = "ai_scout_" + team.replace(/\s+/g, '_') + formattedDate;

  const cachedReport = cache.get(cacheKey);
  if (cachedReport) return cachedReport;

  try {
    const prompt = "Give a 2-sentence interesting summary for this MLB team: " + team + ". Make it fun.";
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

    const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true // This allows us to see the error message if it fails
    };

    const res = UrlFetchApp.fetch(url, options);
    const responseText = res.getContentText();
    const json = JSON.parse(responseText);

    // Check if the API actually returned a candidate
    if (json.candidates && json.candidates[0]) {
      const aiText = json.candidates[0].content.parts[0].text;
      cache.put(cacheKey, aiText, 14400); // Cache for 4 hours
      return aiText;
    } else {
      console.warn("Gemini API Error Response:", responseText);
      return "Scouting report currently unavailable.";
    }
  } catch (e) {
    console.error("Function getGeminiTeamReport Error:", e);
    return "Scouting report unavailable.";
  }
}

/**
 * HELPERS: Mapping Names to IDs
 */
function getTeamId(name) {
  const teams = {
    "Arizona Diamondbacks": 109, "Atlanta Braves": 144, "Baltimore Orioles": 110,
    "Boston Red Sox": 111, "Chicago Cubs": 112, "Chicago White Sox": 145,
    "Cincinnati Reds": 113, "Cleveland Guardians": 114, "Colorado Rockies": 115,
    "Detroit Tigers": 116, "Houston Astros": 117, "Kansas City Royals": 118,
    "Los Angeles Angels": 108, "Los Angeles Dodgers": 119, "Miami Marlins": 146,
    "Milwaukee Brewers": 158, "Minnesota Twins": 142, "New York Mets": 121,
    "New York Yankees": 147, "Oakland Athletics": 133, "Philadelphia Phillies": 143,
    "Pittsburgh Pirates": 134, "San Diego Padres": 135, "San Francisco Giants": 137,
    "Seattle Mariners": 136, "St. Louis Cardinals": 138, "Tampa Bay Rays": 139,
    "Texas Rangers": 140, "Toronto Blue Jays": 141, "Washington Nationals": 120
  };
  return teams[name] || 158;
}

function getDivisionId(teamName) {
  const divisions = {
    "Baltimore Orioles": 201, "Boston Red Sox": 201, "New York Yankees": 201, "Tampa Bay Rays": 201, "Toronto Blue Jays": 201,
    "Chicago White Sox": 202, "Cleveland Guardians": 202, "Detroit Tigers": 202, "Kansas City Royals": 202, "Minnesota Twins": 202,
    "Houston Astros": 203, "Los Angeles Angels": 203, "Oakland Athletics": 203, "Seattle Mariners": 203, "Texas Rangers": 203,
    "Atlanta Braves": 204, "Miami Marlins": 204, "New York Mets": 204, "Philadelphia Phillies": 204, "Washington Nationals": 204,
    "Chicago Cubs": 205, "Cincinnati Reds": 205, "Milwaukee Brewers": 205, "Pittsburgh Pirates": 205, "St. Louis Cardinals": 205,
    "Arizona Diamondbacks": 206, "Colorado Rockies": 206, "Los Angeles Dodgers": 206, "San Diego Padres": 206, "San Francisco Giants": 206
  };
  return divisions[teamName] || 205;
}

// Ensure compatibility with other parts of your app
function getTeamIdByName(name) { return getTeamId(name); }
//function getFavoriteTeam() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Configurations").getRange("B1").getValue(); }