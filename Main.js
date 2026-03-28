/**
 * Adds a custom menu to the Google Sheet.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('MLB Data')
    .addItem("Update My Team Dashboard", 'updateMyTeamDashboard')
    .addSeparator()
    .addItem("Update Today's Games", 'updateTodaysGames')
    .addItem('Update Full 2026 Schedule', 'loadDetailed2026Schedule')
    .addToUi();
}

function updateTodaysGames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = ss.getSpreadsheetTimeZone(); // Or Session.getScriptTimeZone()

  // This ensures "today" is actually today in Wisconsin
  const today = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");

  processMLBData("Todays Games", today, today);
}

function loadDetailed2026Schedule() {
  processMLBData("MLB Schedule", "2026-03-20", "2026-11-01");
}

/**
 * Core logic with Case-Insensitive Favorite Team detection.
 */
function processMLBData(tabName, startDate, endDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName(tabName);
  const configSheet = ss.getSheetByName("Configurations");

  if (!targetSheet) return;

  // 1. Get Favorite Teams (Case-Insensitive)
  let favorites = [];
  if (configSheet) {
    const lastRow = configSheet.getLastRow();
    if (lastRow > 1) {
      favorites = configSheet.getRange("A2:A" + lastRow)
        .getValues()
        .flat()
        .filter(String)
        .map(t => t.toString().trim().toLowerCase()); // Force lowercase
    }
  }

  const timezone = ss.getSpreadsheetTimeZone();
  const now = new Date();
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${startDate}&endDate=${endDate}&hydrate=probablePitcher,team,linescore,broadcasts`;

  console.log(url);

  try {
    const response = UrlFetchApp.fetch(url);
    const results = JSON.parse(response.getContentText());

    const dataRows = [[
      "Date", "Fav?", "Start Time", "Away Team", "Record", "Home Team", "Record",
      "Status", "Inning", "Duration", "TV/Radio", "Away Starter", "Home Starter"
    ]];

    if (results.dates && results.dates.length > 0) {
      results.dates.forEach(dateGroup => {
        dateGroup.games.forEach(game => {
          const ls = game.linescore;
          const gameStart = new Date(game.gameDate);
          const startTimeStr = Utilities.formatDate(gameStart, timezone, "h:mm a");

          const awayName = game.teams.away.team.name;
          const homeName = game.teams.home.team.name;

          // 2. Comparison forced to lowercase for both sides
          const isFav = (favorites.includes(awayName.toLowerCase()) ||
            favorites.includes(homeName.toLowerCase())) ? "Yes" : "No";

          const awayRec = game.teams.away.leagueRecord ? `${game.teams.away.leagueRecord.wins}-${game.teams.away.leagueRecord.losses}` : "0-0";
          const homeRec = game.teams.home.leagueRecord ? `${game.teams.home.leagueRecord.wins}-${game.teams.home.leagueRecord.losses}` : "0-0";

          let status = "Pending";
          let inningDisplay = "-";
          if (game.status.abstractGameState === "Live") {
            status = "Live";
            inningDisplay = ls ? `${ls.inningState} ${ls.currentInningOrdinal}` : "In Progress";
          } else if (game.status.abstractGameState === "Final") {
            status = "Final";
            inningDisplay = ls ? `Final (${ls.scheduledInnings})` : "Final";
          }

          let durationDisplay = "-";
          if (status === "Final" && game.gameDurationMinutes) {
            const hours = Math.floor(game.gameDurationMinutes / 60);
            const mins = game.gameDurationMinutes % 60;
            durationDisplay = `${hours}h ${mins.toString().padStart(2, '0')}m`;
          } else if (status === "Live") {
            const diffMs = now - gameStart;
            if (diffMs > 0) {
              const diffMins = Math.floor(diffMs / 60000);
              const hours = Math.floor(diffMins / 60);
              const mins = diffMins % 60;
              durationDisplay = `Live: ${hours}h ${mins.toString().padStart(2, '0')}m`;
            } else { durationDisplay = "Starting Soon"; }
          }

          let tvBroadcasts = [];
          if (game.broadcasts) {
            game.broadcasts.forEach(b => { if (b.type === 'TV') tvBroadcasts.push(b.callSign); });
          }
          const broadcastDisplay = tvBroadcasts.length > 0 ? tvBroadcasts.join(", ") : "Check Local";

          const awayStarter = game.teams.away.probablePitcher ? game.teams.away.probablePitcher.fullName : "TBD";
          const homeStarter = game.teams.home.probablePitcher ? game.teams.home.probablePitcher.fullName : "TBD";

          dataRows.push([
            dateGroup.date, isFav, startTimeStr,
            awayName, awayRec, homeName, homeRec,
            status, inningDisplay, durationDisplay,
            broadcastDisplay, awayStarter, homeStarter
          ]);
        });
      });
    }

    targetSheet.clear();
    if (dataRows.length > 1) {
      targetSheet.getRange(1, 1, dataRows.length, dataRows[0].length).setValues(dataRows);

      const headerRange = targetSheet.getRange(1, 1, 1, 13);
      headerRange.setFontWeight("bold").setBackground("#002D72").setFontColor("white");
      targetSheet.setFrozenRows(1);
      targetSheet.autoResizeColumns(1, 13);

      for (let i = 1; i < dataRows.length; i++) {
        if (dataRows[i][6] === "Live") {
          targetSheet.getRange(i + 1, 1, 1, 13).setBackground("#FFF2CC");
        }
        if (dataRows[i][1] === "Yes") {
          // Target the "Yes" cell specifically for styling
          targetSheet.getRange(i + 1, 2).setFontWeight("bold").setFontColor("#002D72");
        }
      }
    }
  } catch (e) { console.log("Error: " + e.toString()); }
}