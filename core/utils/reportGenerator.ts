import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChainConfig {
  chainName: string;
  chainId: number;
  rpc: string;
  nativeSymbol: string;
}

interface TestResults {
  chainConfig: ChainConfig;
  balance?: {
    success: boolean;
    data?: {
      address: string;
      balance: string;
    };
    error?: string;
  };
  legacyTransfer?: {
    success: boolean;
    data?: {
      transactionHash: string;
      blockNumber: string;
      from: string;
      to: string;
      gasUsed: string;
      status: boolean;
    };
    error?: string;
  };
  tssTransfer?: {
    success: boolean;
    data?: {
      transactionHash: string;
      blockNumber: string;
      from: string;
      to: string;
      gasUsed: string;
      status: boolean;
    };
    error?: string;
  };
  rpcTesting?: {
    success: boolean;
    data?: {
      chainName: string;
      rpcUrl: string;
      timestamp: string;
      results: Array<{
        method: string;
        category: string;
        supported: boolean;
        error?: string;
        executionTime: number;
      }>;
      summary: {
        total: number;
        supported: number;
        unsupported: number;
        successRate: string;
      };
    };
    error?: string;
  };
}

export function generateTestReport(results: TestResults): jsPDF {
  const doc = new jsPDF();
  let yPosition = 20;

  // Add BitGo logo/title
  doc.setFontSize(24);
  doc.setTextColor(0, 102, 255); // BitGo blue
  doc.text('BitGo Blockchain Test Report', 105, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });

  yPosition += 15;

  // Chain Configuration Section
  doc.setFontSize(16);
  doc.setTextColor(0, 102, 255);
  doc.text('Chain Configuration', 14, yPosition);
  yPosition += 8;

  const chainData = [
    ['Chain Name', results.chainConfig.chainName],
    ['Chain ID', results.chainConfig.chainId.toString()],
    ['Native Symbol', results.chainConfig.nativeSymbol],
    ['RPC URL', results.chainConfig.rpc],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Property', 'Value']],
    body: chainData,
    theme: 'striped',
    headStyles: { fillColor: [0, 102, 255] },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Balance Check Section
  if (results.balance) {
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 255);
    doc.text('Balance Check', 14, yPosition);
    yPosition += 8;

    const balanceData: string[][] = [];
    if (results.balance.success && results.balance.data) {
      balanceData.push(
        ['Status', '✓ Success'],
        ['Address', results.balance.data.address],
        ['Balance', `${results.balance.data.balance} ${results.chainConfig.nativeSymbol}`]
      );
    } else {
      balanceData.push(
        ['Status', '✗ Failed'],
        ['Error', results.balance.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: balanceData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Legacy Transfer Section
  if (results.legacyTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 102, 255);
    doc.text('Legacy Tx - EIP-155 (Type 0)', 14, yPosition);
    yPosition += 8;

    const transferData: string[][] = [];
    if (results.legacyTransfer.success && results.legacyTransfer.data) {
      const data = results.legacyTransfer.data;
      transferData.push(
        ['Status', '✓ Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Number', data.blockNumber],
        ['From', data.from],
        ['To', data.to],
        ['Gas Used', data.gasUsed],
        ['Transaction Status', data.status ? 'Confirmed' : 'Failed']
      );
    } else {
      transferData.push(
        ['Status', '✗ Failed'],
        ['Error', results.legacyTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: transferData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // TSS Transfer Section
  if (results.tssTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 102, 255);
    doc.text('EIP-1559 Tx (Type 2)', 14, yPosition);
    yPosition += 8;

    const tssData: string[][] = [];
    if (results.tssTransfer.success && results.tssTransfer.data) {
      const data = results.tssTransfer.data;
      tssData.push(
        ['Status', '✓ Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Number', data.blockNumber],
        ['From', data.from],
        ['To', data.to],
        ['Gas Used', data.gasUsed],
        ['Transaction Status', data.status ? 'Confirmed' : 'Failed']
      );
    } else {
      tssData.push(
        ['Status', '✗ Failed'],
        ['Error', results.tssTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: tssData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // RPC Testing Section
  if (results.rpcTesting && results.rpcTesting.success && results.rpcTesting.data) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(0, 102, 255);
    doc.text('RPC Methods Testing', 14, yPosition);
    yPosition += 8;

    const rpcData = results.rpcTesting.data;

    // Summary
    const summaryData = [
      ['Total Methods Tested', rpcData.summary.total.toString()],
      ['Supported', rpcData.summary.supported.toString()],
      ['Unsupported', rpcData.summary.unsupported.toString()],
      ['Success Rate', rpcData.summary.successRate],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Summary', '']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [0, 102, 255] },
      margin: { left: 14, right: 14 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Detailed Results by Category
    const categories = [...new Set(rpcData.results.map((r) => r.category))];

    categories.forEach((category) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 102, 255);
      doc.text(category, 14, yPosition);
      yPosition += 6;

      const categoryResults = rpcData.results.filter((r) => r.category === category);
      const tableData = categoryResults.map((r) => [
        r.method,
        r.supported ? '✓ Supported' : '✗ Not Supported',
        `${r.executionTime}ms`,
        r.error || 'Working',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Method', 'Status', 'Time', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 255], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} | BitGo Blockchain Test Report`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

export function saveReport(doc: jsPDF, fileName: string): void {
  doc.save(fileName);
}
