/**
 * MLB Roster Graphic Generator
 * Symmetrical layout with a left-side margin buffer and an extra-large logo.
 */

function updateRosterTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName("Configurations");
  
  // 1. PULL CONFIGURATIONS
  const myTeamName = configSheet.getRange("A2").getValue().toString().trim();
  const timezone = ss.getSpreadsheetTimeZone();
  const isTestMode = configSheet.getRange("B2").getValue();
  const cellValue = configSheet.getRange("C2").getValue();
  
  // Dynamic Date Logic
  let targetDate = (isTestMode && cellValue instanceof Date) ? cellValue : new Date();
  const dateHeader = Utilities.formatDate(targetDate, timezone, "MMMM d, yyyy").toUpperCase();

  // 2. FETCH TEAM DATA & ROSTER
  const teamsUrl = "https://statsapi.mlb.com/api/v1/teams?sportId=1";
  const teamsRes = JSON.parse(UrlFetchApp.fetch(teamsUrl).getContentText());
  const team = teamsRes.teams.find(t => t.name === myTeamName);
  
  if (!team) {
    SpreadsheetApp.getUi().alert("Error: Team name in Configurations A2 must match MLB exactly.");
    return;
  }

  const rosterUrl = `https://statsapi.mlb.com/api/v1/teams/${team.id}/roster?rosterType=40Man`;
  const rosterRes = JSON.parse(UrlFetchApp.fetch(rosterUrl).getContentText());
  
  let rosterSheet = ss.getSheetByName("Team Roster") || ss.insertSheet("Team Roster");
  rosterSheet.clear().clearFormats().setTabColor("#0046ad");
  rosterSheet.setHiddenGridlines(true);
  
  // 3. GROUP PLAYERS
  let groups = { "INFIELDERS": [], "OUTFIELDERS": [], "CATCHERS": [], "PITCHERS": [], "INJURED LIST": [] };
  
  rosterRes.roster.forEach(p => {
    const playerInfo = [p.jerseyNumber || " ", p.person.fullName.toUpperCase()];
    const pos = p.position.abbreviation;
    const status = p.status.code;

    if (status !== "A") {
      groups["INJURED LIST"].push(playerInfo);
    } else if (pos === "P") {
      groups["PITCHERS"].push(playerInfo);
    } else if (pos === "C") {
      groups["CATCHERS"].push(playerInfo);
    } else if (["LF","CF","RF","OF"].includes(pos)) {
      groups["OUTFIELDERS"].push(playerInfo);
    } else {
      groups["INFIELDERS"].push(playerInfo);
    }
  });

  // 4. HEADER STYLING (Column A is the Margin)
  rosterSheet.getRange("A:F").setBackground("#0046ad"); 
  
  // Row 1: Date Header (Centered B through F)
  rosterSheet.setRowHeight(1, 40);
  rosterSheet.getRange("B1:F1").merge().setValue(dateHeader)
    .setFontColor("white").setFontSize(14).setHorizontalAlignment("center")
    .setFontWeight("bold").setVerticalAlignment("middle");
  
  // Rows 2-5: MASSIVE Logo and Title
  rosterSheet.setRowHeights(2, 4, 80); // Increased row height to 80px for a bigger logo
  
  // Insert Team Logo (Merged B2:B5)
  const logoUrl = `https://www.mlbstatic.com/team-logos/${team.id}.svg`;
  rosterSheet.getRange("B2:B5").merge()
    .setFormula(`=IMAGE("${logoUrl}", 1)`)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  // Roster Text (Columns C through F)
  rosterSheet.getRange("C2:F5").merge()
    .setValue("ROSTER")
    .setFontColor("white")
    .setFontSize(120) 
    .setFontWeight("bold")
    .setFontStyle("italic")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle")
    .setWrap(false);

  // 5. DRAW DATA COLUMNS
  let leftRow = 7;
  leftRow = writeSection(rosterSheet, "INFIELDERS", groups["INFIELDERS"], leftRow, 2);
  leftRow = writeSection(rosterSheet, "OUTFIELDERS", groups["OUTFIELDERS"], leftRow + 1, 2);
  leftRow = writeSection(rosterSheet, "INJURED LIST", groups["INJURED LIST"], leftRow + 1, 2);
  
  let rightRow = 7;
  rightRow = writeSection(rosterSheet, "CATCHERS", groups["CATCHERS"], rightRow, 5);
  rightRow = writeSection(rosterSheet, "PITCHERS", groups["PITCHERS"], rightRow + 1, 5);

  // 6. FINAL LAYOUT POLISH
  rosterSheet.setColumnWidth(1, 150); // LEFT BUFFER (Empty Space)
  rosterSheet.setColumnWidth(2, 200); // LOGO & Jersey Left (Widened for bigger logo)
  rosterSheet.setColumnWidth(3, 280); // Name Left
  rosterSheet.setColumnWidth(4, 60);  // Center Gutter
  rosterSheet.setColumnWidth(5, 60);  // Jersey Num Right
  rosterSheet.setColumnWidth(6, 350); // Name Right
  
  rosterSheet.getRange(7, 2, 100, 5).setVerticalAlignment("middle");
}

function writeSection(sheet, title, players, startRow, startCol) {
  if (players.length === 0) return startRow;
  
  sheet.getRange(startRow, startCol, 1, 2).merge().setValue(title)
    .setFontColor("#fec524").setFontStyle("italic").setFontWeight("bold").setFontSize(18);
  
  players.forEach((p, i) => {
    const row = startRow + 1 + i;
    sheet.getRange(row, startCol).setValue(p[0])
      .setFontColor("#fec524").setFontWeight("bold").setHorizontalAlignment("right");
    sheet.getRange(row, startCol + 1).setValue("  " + p[1])
      .setFontColor("white").setFontWeight("bold").setWrap(false);
  });
  
  return startRow + players.length + 1; 
}