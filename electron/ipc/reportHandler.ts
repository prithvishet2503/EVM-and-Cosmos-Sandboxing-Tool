import { ipcMain, dialog } from 'electron';
import { generateTestReport, saveReport } from '../../core/utils/reportGenerator.js';
import path from 'path';
import os from 'os';

export function registerReportHandlers() {
  ipcMain.handle('report:export', async (_event, results) => {
    try {
      // Generate the PDF
      const pdf = generateTestReport(results);

      // Create default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const defaultFileName = `BitGo-Test-Report-${results.chainConfig?.chainName || 'Chain'}-${timestamp}.pdf`;

      // Show save dialog
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save Test Report',
        defaultPath: path.join(os.homedir(), 'Downloads', defaultFileName),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Save canceled' };
      }

      // Save the PDF
      saveReport(pdf, filePath);

      return {
        success: true,
        message: 'Report exported successfully',
        filePath
      };
    } catch (error: any) {
      console.error('Failed to export report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}
