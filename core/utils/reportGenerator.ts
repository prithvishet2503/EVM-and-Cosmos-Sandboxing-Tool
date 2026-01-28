import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChainConfig {
  chainName: string;
  chainId: number | string;
  rpc: string;
  nativeSymbol?: string;
  denom?: string;
  addressPrefix?: string;
  jiraTicket?: string;
}

interface TestResults {
  chainConfig: ChainConfig;
  balance?: {
    success: boolean;
    data?: {
      address: string;
      balance: string;
      denom?: string;
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
  simpleTransfer?: {
    success: boolean;
    data?: {
      transactionHash: string;
      blockHeight: number;
      from: string;
      to: string;
      amount: string;
      denom: string;
      gasUsed: string;
    };
    error?: string;
  };
  stepByStepTransfer?: {
    success: boolean;
    data?: {
      transactionHash: string;
      blockHeight: number;
      from: string;
      to: string;
      amount: string;
      denom: string;
      gasUsed: string;
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
  contractDeployment?: {
    success: boolean;
    contracts?: {
      walletImplementation?: {
        name: string;
        address: string;
        transactionHash: string;
        gasUsed: string;
        deploymentCost: string;
      };
      walletFactory?: {
        name: string;
        address: string;
        transactionHash: string;
        gasUsed: string;
        deploymentCost: string;
      };
      forwarderImplementation?: {
        name: string;
        address: string;
        transactionHash: string;
        gasUsed: string;
        deploymentCost: string;
      };
      forwarderFactory?: {
        name: string;
        address: string;
        transactionHash: string;
        gasUsed: string;
        deploymentCost: string;
      };
    };
    totalGasUsed?: string;
    totalCostEth?: string;
    deploymentTime?: number;
    errors?: string[];
  };
}

export function generateTestReport(results: TestResults): jsPDF {
  const doc = new jsPDF();
  let yPosition = 20;

  // Add BitGo logo/title with modern styling
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 255); // BitGo blue
  doc.text('BitGo Blockchain Test Report', 105, yPosition, { align: 'center' });

  yPosition += 8;
  // Add divider line
  doc.setDrawColor(0, 102, 255);
  doc.setLineWidth(1.5);
  doc.line(50, yPosition, 160, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' });

  yPosition += 15;

  // Chain Configuration Section
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 102, 255);
  doc.text('Chain Configuration', 14, yPosition);
  yPosition += 2;
  // Add section underline
  doc.setDrawColor(0, 102, 255);
  doc.setLineWidth(0.5);
  doc.line(14, yPosition, 70, yPosition);
  yPosition += 6;

  const chainData = [
    ['Chain Name', results.chainConfig.chainName],
    ['Chain ID', results.chainConfig.chainId.toString()],
    ...(results.chainConfig.nativeSymbol ? [['Native Symbol', results.chainConfig.nativeSymbol]] : []),
    ...(results.chainConfig.denom ? [['Denom', results.chainConfig.denom]] : []),
    ...(results.chainConfig.addressPrefix ? [['Address Prefix', results.chainConfig.addressPrefix]] : []),
    ['RPC URL', results.chainConfig.rpc],
    ...(results.chainConfig.jiraTicket ? [['JIRA Ticket', results.chainConfig.jiraTicket]] : []),
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Property', 'Value']],
    body: chainData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 102, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 11
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [50, 50, 50]
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250]
    },
    margin: { left: 14, right: 14 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Balance Check Section
  if (results.balance) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('Balance Check', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 55, yPosition);
    yPosition += 6;

    const balanceData: string[][] = [];
    if (results.balance.success && results.balance.data) {
      const unit = results.balance.data.denom || results.chainConfig.nativeSymbol || '';
      balanceData.push(
        ['Status', 'Success'],
        ['Address', results.balance.data.address],
        ['Balance', `${results.balance.data.balance} ${unit}`]
      );
    } else {
      balanceData.push(
        ['Status', 'Failed'],
        ['Error', results.balance.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: balanceData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 40,
          textColor: [70, 70, 70]
        },
        1: {
          textColor: [50, 50, 50]
        }
      },
      bodyStyles: {
        fontSize: 10
      },
      didParseCell: function(data) {
        // Color code status cells
        if (data.cell.text[0] === 'Success') {
          data.cell.styles.textColor = [34, 139, 34]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Failed') {
          data.cell.styles.textColor = [220, 20, 60]; // Red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Legacy Transfer Section
  if (results.legacyTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('Legacy Tx - EIP-155 (Type 0)', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 80, yPosition);
    yPosition += 6;

    const transferData: string[][] = [];
    if (results.legacyTransfer.success && results.legacyTransfer.data) {
      const data = results.legacyTransfer.data;
      transferData.push(
        ['Status', 'Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Number', data.blockNumber],
        ['From', data.from],
        ['To', data.to],
        ['Gas Used', data.gasUsed],
        ['Transaction Status', data.status ? 'Confirmed' : 'Failed']
      );
    } else {
      transferData.push(
        ['Status', 'Failed'],
        ['Error', results.legacyTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: transferData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 55,
          textColor: [70, 70, 70]
        },
        1: {
          textColor: [50, 50, 50]
        }
      },
      bodyStyles: {
        fontSize: 9
      },
      didParseCell: function(data) {
        if (data.cell.text[0] === 'Success' || data.cell.text[0] === 'Confirmed') {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Failed') {
          data.cell.styles.textColor = [220, 20, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // TSS Transfer Section
  if (results.tssTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('EIP-1559 Tx (Type 2)', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 70, yPosition);
    yPosition += 6;

    const tssData: string[][] = [];
    if (results.tssTransfer.success && results.tssTransfer.data) {
      const data = results.tssTransfer.data;
      tssData.push(
        ['Status', 'Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Number', data.blockNumber],
        ['From', data.from],
        ['To', data.to],
        ['Gas Used', data.gasUsed],
        ['Transaction Status', data.status ? 'Confirmed' : 'Failed']
      );
    } else {
      tssData.push(
        ['Status', 'Failed'],
        ['Error', results.tssTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: tssData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 55,
          textColor: [70, 70, 70]
        },
        1: {
          textColor: [50, 50, 50]
        }
      },
      bodyStyles: {
        fontSize: 9
      },
      didParseCell: function(data) {
        if (data.cell.text[0] === 'Success' || data.cell.text[0] === 'Confirmed') {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Failed') {
          data.cell.styles.textColor = [220, 20, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Simple Transfer Section (Cosmos)
  if (results.simpleTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('Simple Transfer', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 60, yPosition);
    yPosition += 6;

    const simpleTransferData: string[][] = [];
    if (results.simpleTransfer.success && results.simpleTransfer.data) {
      const data = results.simpleTransfer.data;
      simpleTransferData.push(
        ['Status', 'Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Height', data.blockHeight.toString()],
        ['From', data.from],
        ['To', data.to],
        ['Amount', `${data.amount} ${data.denom}`],
        ['Gas Used', data.gasUsed]
      );
    } else {
      simpleTransferData.push(
        ['Status', 'Failed'],
        ['Error', results.simpleTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: simpleTransferData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 55,
          textColor: [70, 70, 70]
        },
        1: {
          textColor: [50, 50, 50]
        }
      },
      bodyStyles: {
        fontSize: 9
      },
      didParseCell: function(data) {
        if (data.cell.text[0] === 'Success') {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Failed') {
          data.cell.styles.textColor = [220, 20, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Step-by-Step Transfer Section (Cosmos)
  if (results.stepByStepTransfer) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('Step-by-Step Transfer', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 80, yPosition);
    yPosition += 6;

    const stepTransferData: string[][] = [];
    if (results.stepByStepTransfer.success && results.stepByStepTransfer.data) {
      const data = results.stepByStepTransfer.data;
      stepTransferData.push(
        ['Status', 'Success'],
        ['Transaction Hash', data.transactionHash],
        ['Block Height', data.blockHeight.toString()],
        ['From', data.from],
        ['To', data.to],
        ['Amount', `${data.amount} ${data.denom}`],
        ['Gas Used', data.gasUsed]
      );
    } else {
      stepTransferData.push(
        ['Status', 'Failed'],
        ['Error', results.stepByStepTransfer.error || 'Unknown error']
      );
    }

    autoTable(doc, {
      startY: yPosition,
      body: stepTransferData,
      theme: 'plain',
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: {
          fontStyle: 'bold',
          cellWidth: 55,
          textColor: [70, 70, 70]
        },
        1: {
          textColor: [50, 50, 50]
        }
      },
      bodyStyles: {
        fontSize: 9
      },
      didParseCell: function(data) {
        if (data.cell.text[0] === 'Success') {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.text[0] === 'Failed') {
          data.cell.styles.textColor = [220, 20, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Contract Deployment Section
  if (results.contractDeployment) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('BitGo Contract Deployment', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 85, yPosition);
    yPosition += 6;

    if (results.contractDeployment.success && results.contractDeployment.contracts) {
      // Summary
      const summaryData: string[][] = [
        ['Status', 'Success'],
        ['Total Gas Used', results.contractDeployment.totalGasUsed || 'N/A'],
        ['Total Cost', `${results.contractDeployment.totalCostEth || 'N/A'} ${results.chainConfig.nativeSymbol || 'ETH'}`],
        ['Deployment Time', `${((results.contractDeployment.deploymentTime || 0) / 1000).toFixed(2)}s`],
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Summary', '']],
        body: summaryData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 102, 255],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 11
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250]
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
          if (data.cell.text[0] === 'Success') {
            data.cell.styles.textColor = [34, 139, 34];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 12;

      // Deployed Contracts
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 255);
      doc.text('Deployed Contracts', 14, yPosition);
      yPosition += 2;
      doc.setDrawColor(0, 102, 255);
      doc.setLineWidth(0.3);
      doc.line(14, yPosition, 65, yPosition);
      yPosition += 6;

      const contracts = results.contractDeployment.contracts;
      const contractsData: string[][] = [];

      if (contracts.walletImplementation) {
        contractsData.push(
          ['WalletSimple (Implementation)', ''],
          ['  Address', contracts.walletImplementation.address],
          ['  Transaction Hash', contracts.walletImplementation.transactionHash],
          ['  Gas Used', contracts.walletImplementation.gasUsed],
          ['  Cost', `${contracts.walletImplementation.deploymentCost} ${results.chainConfig.nativeSymbol || 'ETH'}`]
        );
      }

      if (contracts.walletFactory) {
        contractsData.push(
          ['WalletFactory', ''],
          ['  Address', contracts.walletFactory.address],
          ['  Transaction Hash', contracts.walletFactory.transactionHash],
          ['  Gas Used', contracts.walletFactory.gasUsed],
          ['  Cost', `${contracts.walletFactory.deploymentCost} ${results.chainConfig.nativeSymbol || 'ETH'}`]
        );
      }

      if (contracts.forwarderImplementation) {
        contractsData.push(
          ['ForwarderV4 (Implementation)', ''],
          ['  Address', contracts.forwarderImplementation.address],
          ['  Transaction Hash', contracts.forwarderImplementation.transactionHash],
          ['  Gas Used', contracts.forwarderImplementation.gasUsed],
          ['  Cost', `${contracts.forwarderImplementation.deploymentCost} ${results.chainConfig.nativeSymbol || 'ETH'}`]
        );
      }

      if (contracts.forwarderFactory) {
        contractsData.push(
          ['ForwarderFactoryV4', ''],
          ['  Address', contracts.forwarderFactory.address],
          ['  Transaction Hash', contracts.forwarderFactory.transactionHash],
          ['  Gas Used', contracts.forwarderFactory.gasUsed],
          ['  Cost', `${contracts.forwarderFactory.deploymentCost} ${results.chainConfig.nativeSymbol || 'ETH'}`]
        );
      }

      autoTable(doc, {
        startY: yPosition,
        body: contractsData,
        theme: 'plain',
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            cellWidth: 65,
            textColor: [70, 70, 70]
          },
          1: {
            textColor: [50, 50, 50],
            fontSize: 8
          }
        },
        bodyStyles: {
          fontSize: 9
        },
        didParseCell: function(data) {
          // Make contract names more prominent
          if (data.row.index % 5 === 0) {
            data.cell.styles.fillColor = [240, 248, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 102, 255];
          }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      // Deployment failed
      const failureData: string[][] = [
        ['Status', 'Failed'],
        ['Errors', (results.contractDeployment.errors || ['Unknown error']).join(', ')]
      ];

      autoTable(doc, {
        startY: yPosition,
        body: failureData,
        theme: 'plain',
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: {
            fontStyle: 'bold',
            cellWidth: 40,
            textColor: [70, 70, 70]
          },
          1: {
            textColor: [50, 50, 50]
          }
        },
        bodyStyles: {
          fontSize: 10
        },
        didParseCell: function(data) {
          if (data.cell.text[0] === 'Failed') {
            data.cell.styles.textColor = [220, 20, 60];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // RPC Testing Section
  if (results.rpcTesting && results.rpcTesting.success && results.rpcTesting.data) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 102, 255);
    doc.text('RPC Methods Testing', 14, yPosition);
    yPosition += 2;
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, 75, yPosition);
    yPosition += 6;

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
      headStyles: {
        fillColor: [0, 102, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      },
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
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 102, 255);
      doc.text(category, 14, yPosition);
      yPosition += 2;
      doc.setDrawColor(0, 102, 255);
      doc.setLineWidth(0.3);
      const textWidth = doc.getTextWidth(category);
      doc.line(14, yPosition, 14 + textWidth, yPosition);
      yPosition += 4;

      const categoryResults = rpcData.results.filter((r) => r.category === category);
      const tableData = categoryResults.map((r) => [
        r.method,
        r.supported ? 'Supported' : 'Not Supported',
        `${r.executionTime}ms`,
        r.error || 'Working',
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Method', 'Status', 'Time', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 102, 255],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50]
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250]
        },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' },
        },
        didParseCell: function(data) {
          if (data.column.index === 1 && data.section === 'body') {
            if (data.cell.text[0] === 'Supported') {
              data.cell.styles.textColor = [34, 139, 34];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.text[0] === 'Not Supported') {
              data.cell.styles.textColor = [220, 20, 60];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
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
