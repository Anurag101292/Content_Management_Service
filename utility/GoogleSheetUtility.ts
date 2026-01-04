import { google, sheets_v4 } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

export class GoogleSheetUtility {
    private spreadsheetId: string;
    private sheetName: string;
    private auth: GoogleAuth;
    private service: sheets_v4.Sheets | null = null;
    private credentialsPath: string;

    constructor(spreadsheetId: string, credentialsPath: string, sheetName: string = "TrendsData") {
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        this.credentialsPath = credentialsPath;

        this.auth = new GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    private async getService(): Promise<sheets_v4.Sheets> {
        if (!this.service) {
            this.service = google.sheets({ version: 'v4', auth: this.auth });
        }
        return this.service;
    }

    private async ensureHeaders(targetSheetName: string = this.sheetName): Promise<void> {
        try {
            const service = await this.getService();
            // Check if sheet exists or is empty by trying to read A1:E1
            const result = await service.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: `${targetSheetName}!A1:E1`,
            });

            if (!result.data.values || result.data.values.length === 0) {
                const headers = ["Date", "Query", "Search Volume", "Categories", "Percentage"];
                await service.spreadsheets.values.update({
                    spreadsheetId: this.spreadsheetId,
                    range: `${targetSheetName}!A1`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: {
                        values: [headers],
                    },
                });
                console.log(`Headers added to ${targetSheetName}.`);
            }
        } catch (error: any) {
            console.error(`Error checking headers: ${error.message}. Ensure sheet '${targetSheetName}' exists.`);
        }
    }

    public async saveTrendsData(data: any[], targetSheetName: string = this.sheetName): Promise<void> {
        await this.ensureHeaders(targetSheetName);

        // Get current timestamp in IST
        const now = new Date();
        const currentTime = now.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false // Use 24-hour format matching original Python strftime
        }).replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+:\d+)/, "$3-$2-$1 $4"); // Format as YYYY-MM-DD HH:MM:SS

        const rows = data.map(item => {
            // Flatten categories list to string
            let categoriesStr = "";
            if (Array.isArray(item.categories)) {
                categoriesStr = item.categories.map((cat: any) => cat.name || cat).join(", ");
            }

            // Get increase_percentage (default to 0 if not present)
            const increasePercentage = item.increase_percentage || 0;

            return [
                currentTime,
                item.query,
                item.search_volume,
                categoriesStr,
                increasePercentage
            ];
        });

        if (rows.length === 0) {
            console.log("No data to save.");
            return;
        }

        const service = await this.getService();
        try {
            await service.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${targetSheetName}!A2`,
                valueInputOption: "USER_ENTERED",
                insertDataOption: "INSERT_ROWS",
                requestBody: {
                    values: rows,
                },
            });
            console.log(`Successfully appended ${rows.length} rows to ${targetSheetName} at ${currentTime}`);
        } catch (error: any) {
            console.error(`Error appending data: ${error.message}`);
        }
    }

    public async saveTwitterTrends(data: any[]): Promise<void> {
        // Explicitly format/save to Sheet2
        await this.saveTrendsData(data, "Sheet2");
    }
}
