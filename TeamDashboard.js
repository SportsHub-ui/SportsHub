/**
 * MLB My Team Dashboard - Version 2.5
 * Features: Last 4 Games restored, Refreshed in F3, Inning Line Score, 
 * High-Contrast Standings, and Next 5 Games.
 */
function updateMyTeamDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName("My Team");
  const configSheet = ss.getSheetByName("Configurations");
  
  if (!dashSheet || !configSheet) return;

  const myTeam = configSheet.getRange("A2").getValue().toString().trim();
  if (!myTeam) return;

  const teamColors = {
    "Milwaukee Brewers": { primary: "#002D62", secondary: "#B6922E" },
    "Chicago Cubs":      { primary: "#0E3386", secondary: "#CC3433" },
    "St. Louis Cardinals": { primary: "#C41E3A", secondary: "#FEDB00" },
    "Cincinnati Reds":   { primary: "#C6011F", secondary: "#000000" },
    "Pittsburgh Pirates": { primary: "#27251F", secondary: "#FDB827" }
  };

  const colors = teamColors[myTeam] || { primary: "#002D72", secondary: "#666666" };
  const timezone = ss.getSpreadsheetTimeZone();
  const now = new Date();
  
  const start = Utilities.formatDate(new Date(now.getTime() - 10*24*60*60*1000), "GMT", "yyyy-MM-dd");
  const end = Utilities.formatDate(new Date(now.getTime() + 10*24*60*60*1000), "GMT", "yyyy-MM-dd");
  
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&startDate=${start}&endDate=${end}&hydrate=probablePitcher,team,linescore,broadcasts,seriesStatus`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const results = JSON.parse(response.getContentText());
    let allGames = [];
    let divId = null;

    if (results.dates) {
      results.dates.forEach(d => d.games.forEach(g => {
        const away = g.teams.away.team.name;
        const home = g.teams.home.team.name;
        if (away.toLowerCase() === myTeam.toLowerCase() || home.toLowerCase() === myTeam.toLowerCase()) {
          allGames.push(g);
          if (!divId) {
            const teamObj = (away.toLowerCase() === myTeam.toLowerCase()) ? g.teams.away.team : g.teams.home.team;
            divId = teamObj.division ? teamObj.division.id : null;
          }
        }
      }));
    }

    const targetGame = allGames.find(g => g.status.abstractGameState !== "Final") || allGames[allGames.length - 1];
    const pastGames = allGames.filter(g => g.status.abstractGameState === "Final").reverse().slice(0, 4);
    const futureGames = allGames.filter(g => g.status.abstractGameState === "Preview" && g.gamePk !== targetGame.gamePk).slice(0, 5);

    dashSheet.clear();
    if (!targetGame) return;

    // --- 1. HEADER & REFRESHED (F3) ---
    dashSheet.getRange("B2:F2").merge().setValue(myTeam).setFontSize(28).setFontWeight("bold").setFontColor(colors.primary);
    dashSheet.getRange("F3").setValue("Refreshed: " + Utilities.formatDate(now, timezone, "h:mm a"))
             .setFontSize(9).setFontColor("#999999").setHorizontalAlignment("right");

    const isAway = targetGame.teams.away.team.name.toLowerCase() === myTeam.toLowerCase();
    const opp = isAway ? targetGame.teams.home.team.name : targetGame.teams.away.team.name;
    dashSheet.getRange("B3").setValue((isAway ? "@ " : "vs ") + opp).setFontSize(14).setFontColor("#666666");

    // --- 2. LIVE SCOREBOARD & INNING LINE ---
    const sBox = dashSheet.getRange("B5:C6");
    sBox.merge().setBackground("#f8f9fa").setBorder(true, true, true, true, null, null, colors.primary, SpreadsheetApp.BorderStyle.SOLID_MEDIUM).setHorizontalAlignment("center").setVerticalAlignment("middle");

    if (targetGame.status.abstractGameState !== "Preview") {
      const ls = targetGame.linescore;
      sBox.setValue(`${ls.teams.away.runs || 0} - ${ls.teams.home.runs || 0}`).setFontSize(32).setFontColor(colors.primary);
      dashSheet.getRange("B7").setValue(targetGame.status.abstractGameState === "Live" ? `📍 ${ls.inningState} ${ls.currentInningOrdinal}` : "🏁 FINAL").setFontWeight("bold");
      
      let header = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "R", "H", "E"];
      let aRow = [targetGame.teams.away.team.abbreviation], hRow = [targetGame.teams.home.team.abbreviation];
      for (let i = 0; i < 9; i++) {
        let inn = ls.innings[i];
        aRow.push(inn ? (inn.away.runs ?? 0) : "-");
        hRow.push(inn ? (inn.home.runs ?? 0) : "-");
      }
      aRow.push(ls.teams.away.runs || 0, ls.teams.away.hits || 0, ls.teams.away.errors || 0);
      hRow.push(ls.teams.home.runs || 0, ls.teams.home.hits || 0, ls.teams.home.errors || 0);
      dashSheet.getRange(8, 2, 3, 13).setValues([header, aRow, hRow]).setHorizontalAlignment("center").setFontSize(9).setBorder(true, true, true, true, true, true);
      dashSheet.getRange(8, 2, 1, 13).setBackground("#eeeeee").setFontWeight("bold");
      dashSheet.getRange(8, 11, 3, 3).setBackground("#fffde7").setFontWeight("bold");
    } else {
      sBox.setValue("Upcoming").setFontSize(18).setFontColor(colors.secondary);
      dashSheet.getRange("B7").setValue(Utilities.formatDate(new Date(targetGame.gameDate), timezone, "MMM d @ h:mm a")).setFontWeight("bold");
    }

    // Network / Probable / Umpire Details
    dashSheet.getRange("E5").setValue("Network").setFontWeight("bold");
    let tv = (targetGame.broadcasts || []).filter(b => b.type === 'TV').map(b => b.callSign).join(", ");
    dashSheet.getRange("F5").setValue(tv || "TBD");
    dashSheet.getRange("E6").setValue("Probable").setFontWeight("bold");
    const st = isAway ? targetGame.teams.away.probablePitcher : targetGame.teams.home.probablePitcher;
    dashSheet.getRange("F6").setValue(st ? st.fullName : "TBD");
    dashSheet.getRange("E7").setValue("HP Umpire").setFontWeight("bold");
    try {
      const liveData = JSON.parse(UrlFetchApp.fetch(`https://statsapi.mlb.com/api/v1.1/game/${targetGame.gamePk}/feed/live`).getContentText());
      dashSheet.getRange("F7").setValue((liveData.liveData.boxscore.officials || []).find(o => o.officialType === "Home Plate")?.official.fullName || "TBD");
    } catch(e) { dashSheet.getRange("F7").setValue("TBD"); }

    // --- 3. STANDINGS ---
    if (divId) {
      const stUrl = `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026`;
      const stData = JSON.parse(UrlFetchApp.fetch(stUrl).getContentText());
      const divRec = stData.records.find(r => r.division && r.division.id === divId);
      if (divRec) {
        let divName = (divRec.division && divRec.division.name) ? divRec.division.name : "Division";
        const sRow = 13;
        let rows = [["Team", "W", "L", "GB", "L10", "STRK"]];
        let myIdx = -1;
        divRec.teamRecords.forEach((tr, i) => {
          if (tr.team.name.toLowerCase() === myTeam.toLowerCase()) myIdx = i + 1;
          const l10 = tr.records?.expectedRecords?.find(e => e.type === "lastTen");
          rows.push([tr.team.name, tr.wins||0, tr.losses||0, tr.gamesBack||"-", l10 ? `${l10.wins}-${l10.losses}` : "0-0", tr.streak?.streakCode || "-"]);
        });
        dashSheet.getRange(sRow - 1, 2).setValue(divName + " Standings").setFontWeight("bold").setFontSize(13).setFontColor(colors.primary);
        dashSheet.getRange(sRow, 2, 1, 6).setValues([rows[0]]).setBackground(colors.primary).setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
        dashSheet.getRange(sRow + 1, 2, rows.length - 1, 6).setValues(rows.slice(1));
        dashSheet.getRange(sRow, 2, rows.length, 6).setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);
        if (myIdx !== -1) dashSheet.getRange(sRow + myIdx, 2, 1, 6).setBackground("#fff9c4").setFontWeight("bold");
      }
    }

    // --- 4. UPCOMING SCHEDULE (NEXT 5) ---
    const uRow = 22;
    dashSheet.getRange(uRow, 2).setValue("Upcoming Games").setFontWeight("bold").setFontSize(12);
    let uHeaders = [["Date", "Time", "Opponent", "Probable Pitcher", "Series Info"]];
    dashSheet.getRange(uRow + 1, 2, 1, 5).setValues(uHeaders).setBackground("#eeeeee").setFontWeight("bold");
    futureGames.forEach((g, i) => {
      const r = uRow + 2 + i;
      const gIsAway = g.teams.away.team.name.toLowerCase() === myTeam.toLowerCase();
      dashSheet.getRange(r, 2).setValue(Utilities.formatDate(new Date(g.gameDate), timezone, "MMM d"));
      dashSheet.getRange(r, 3).setValue(Utilities.formatDate(new Date(g.gameDate), timezone, "h:mm a"));
      dashSheet.getRange(r, 4).setValue(gIsAway ? "@ " + g.teams.home.team.name : "vs " + g.teams.away.team.name);
      const p = gIsAway ? g.teams.away.probablePitcher : g.teams.home.probablePitcher;
      dashSheet.getRange(r, 5).setValue(p ? p.fullName : "TBD");
      dashSheet.getRange(r, 6).setValue(g.seriesStatus ? `Game ${g.seriesGameNumber} of ${g.gamesInSeries}` : "-").setFontSize(9);
    });

    // --- 5. RECENT RESULTS (LAST 4) ---
    const rRow = 30;
    dashSheet.getRange(rRow, 2).setValue("Recent Results").setFontWeight("bold").setFontSize(12);
    dashSheet.getRange(rRow + 1, 2, 1, 6).setValues([["Date", "Score", "Opponent", "Attendance", "Conditions", "HP Umpire"]]).setBackground("#eeeeee").setFontWeight("bold");
    pastGames.forEach((g, i) => {
      const r = rRow + 2 + i;
      try {
        const gData = JSON.parse(UrlFetchApp.fetch(`https://statsapi.mlb.com/api/v1.1/game/${g.gamePk}/feed/live`).getContentText());
        const w = gData.gameData.weather || {};
        const cond = w.temp ? `${w.temp}° ${w.condition} (${w.wind})` : "Indoor";
        const wasAway = g.teams.away.team.name.toLowerCase() === myTeam.toLowerCase();
        const won = wasAway ? (g.teams.away.score > g.teams.home.score) : (g.teams.home.score > g.teams.away.score);
        dashSheet.getRange(r, 2).setValue(Utilities.formatDate(new Date(g.gameDate), timezone, "MMM d"));
        dashSheet.getRange(r, 3).setValue(`${g.teams.away.score} - ${g.teams.home.score}`).setFontColor(won ? "#2E7D32" : "#C62828").setFontWeight("bold").setHorizontalAlignment("center");
        dashSheet.getRange(r, 4).setValue(wasAway ? "@ " + g.teams.home.team.name : "vs " + g.teams.away.team.name);
        dashSheet.getRange(r, 5).setValue(gData.gameData.attendance ? gData.gameData.attendance.toLocaleString() : "N/A");
        dashSheet.getRange(r, 6).setValue(cond).setFontSize(8);
        dashSheet.getRange(r, 7).setValue((gData.liveData.boxscore.officials || []).find(o => o.officialType === "Home Plate")?.official.fullName || "TBD").setFontSize(8);
      } catch(e) {}
    });

    dashSheet.setColumnWidth(2, 95); dashSheet.setColumnWidth(4, 150); dashSheet.setColumnWidth(5, 150); dashSheet.setColumnWidth(6, 180); dashSheet.setColumnWidth(7, 120);

  } catch (e) { console.log("Dashboard Error: " + e.toString()); }
}