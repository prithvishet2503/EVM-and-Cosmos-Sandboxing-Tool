import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import type { RpcTestResult, RpcTestReport } from '../types/index.js';

export class RpcMethodTester {
    private provider: ethers.JsonRpcProvider;
    private rpcUrl: string;
    private chainName: string;
    private results: RpcTestResult[] = [];
    private testTxHash: string | null = null;
    private testBlockNumber: number | null = null;

    constructor(rpcUrl: string, chainName: string, txHash?: string, blockNumber?: string) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.rpcUrl = rpcUrl;
        this.chainName = chainName;
        
        if (txHash) {
            this.testTxHash = txHash;
            console.log(` Using transaction hash from chain actions: ${txHash}`);
        }
        if (blockNumber) {
            this.testBlockNumber = parseInt(blockNumber);
            console.log(` Using block number from chain actions: ${blockNumber}`);
        }
    }

    async testAllMethods(): Promise<RpcTestReport> {
        console.log(`\ Testing RPC methods for ${this.chainName}`);
        console.log(`📡RPC URL: ${this.rpcUrl}\n`);

        // Block Operations
        await this.testBlockOperations();
        
        // Transaction Operations
        await this.testTransactionOperations();
        
        // Balance & Account Operations
        await this.testBalanceAndAccountOperations();
        
        // Fee Operations
        await this.testFeeOperations();
        
        // Tracing Operations
        await this.testTracingOperations();

        return this.generateReport();
    }

    private async testBlockOperations(): Promise<void> {
        console.log(' Testing Block Operations...');

        await this.testMethod(
            'eth_blockNumber',
            'Block Operations',
            async () => await this.provider.getBlockNumber()
        );

        await this.testMethod(
            'eth_getBlockByNumber',
            'Block Operations',
            async () => {
                const latestBlock = await this.provider.getBlockNumber();
                return await this.provider.getBlock(latestBlock);
            }
        );

        await this.testMethod(
            'eth_getBlockReceipts',
            'Block Operations',
            async () => {
                const latestBlock = await this.provider.getBlockNumber();
                return await this.provider.send('eth_getBlockReceipts', [`0x${latestBlock.toString(16)}`]);
            }
        );
    }

    private async testTransactionOperations(): Promise<void> {
        console.log(' Testing Transaction Operations...');

        if (!this.testTxHash) {
            try {
                const latestBlock = await this.provider.getBlock('latest');
                if (latestBlock && latestBlock.transactions.length > 0) {
                    this.testTxHash = latestBlock.transactions[0] as string;
                    console.log(` Using transaction from latest block: ${this.testTxHash}`);
                }
            } catch (error) {
                console.log('Could not get test transaction hash');
            }
        }

        await this.testMethod(
            'eth_getTransactionByHash',
            'Transaction Operations',
            async () => {
                if (!this.testTxHash) throw new Error('No test transaction available');
                console.log(`Testing with transaction: ${this.testTxHash}`);
                return await this.provider.getTransaction(this.testTxHash);
            }
        );

        await this.testMethod(
            'eth_getTransactionReceipt',
            'Transaction Operations',
            async () => {
                if (!this.testTxHash) throw new Error('No test transaction available');
                console.log(`  Testing with transaction: ${this.testTxHash}`);
                return await this.provider.getTransactionReceipt(this.testTxHash);
            }
        );

        await this.testMethod(
            'eth_getTransactionCount',
            'Transaction Operations',
            async () => {
                const testAddress = '0x0000000000000000000000000000000000000000';
                return await this.provider.getTransactionCount(testAddress);
            }
        );
    }

    private async testBalanceAndAccountOperations(): Promise<void> {
        console.log('💰 Testing Balance & Account Operations...');

        const testAddress = '0x0000000000000000000000000000000000000000';

        await this.testMethod(
            'eth_getBalance',
            'Balance & Account Operations',
            async () => await this.provider.getBalance(testAddress)
        );

        await this.testMethod(
            'eth_call',
            'Balance & Account Operations',
            async () => {
                const callData = { to: testAddress, data: '0x' };
                return await this.provider.call(callData);
            }
        );
    }

    private async testFeeOperations(): Promise<void> {
        console.log('Testing Fee Operations...');

        await this.testMethod(
            'eth_gasPrice',
            'Fee Operations',
            async () => await this.provider.send('eth_gasPrice', [])
        );

        await this.testMethod(
            'eth_feeHistory',
            'Fee Operations',
            async () => {
                return await this.provider.send('eth_feeHistory', [
                    '0x4',
                    'latest',
                    [25, 50, 75]
                ]);
            }
        );
    }

    private async testTracingOperations(): Promise<void> {
        console.log('🔍 Testing Tracing Operations...');

        if (!this.testTxHash || !this.testBlockNumber) {
            try {
                const latestBlock = await this.provider.getBlock('latest');
                if (latestBlock && latestBlock.transactions.length > 0) {
                    if (!this.testTxHash) {
                        this.testTxHash = latestBlock.transactions[0] as string;
                        console.log(`Using transaction from latest block: ${this.testTxHash}`);
                    }
                    if (!this.testBlockNumber) {
                        this.testBlockNumber = latestBlock.number;
                        console.log(` Using latest block number: ${this.testBlockNumber}`);
                    }
                }
            } catch (error) {
                console.log('  Could not get test data for tracing');
            }
        }

        await this.testMethod(
            'debug_traceTransaction',
            'Tracing Operations',
            async () => {
                if (!this.testTxHash) throw new Error('No test transaction available');
                console.log(`  🔍 Tracing transaction: ${this.testTxHash}`);
                return await this.provider.send('debug_traceTransaction', [this.testTxHash, {}]);
            }
        );

        await this.testMethod(
            'debug_traceBlockByNumber',
            'Tracing Operations',
            async () => {
                console.log(`  🔍 Tracing block: latest`);
                return await this.provider.send('debug_traceBlockByNumber', ['latest', {}]);
            }
        );
    }

    private async testMethod(
        methodName: string,
        category: string,
        testFunction: () => Promise<any>
    ): Promise<void> {
        const startTime = Date.now();
        
        try {
            console.log(`  Testing ${methodName}...`);
            const response = await testFunction();
            const executionTime = Date.now() - startTime;
            
            console.log(`  📋 Response for ${methodName}:`);
            console.log(`    ${JSON.stringify(this.truncateResponse(response), null, 2)}`);
            
            this.results.push({
                method: methodName,
                category,
                supported: true,
                response: this.truncateResponse(response),
                executionTime
            });
            
            console.log(`   ${methodName} - Supported (${executionTime}ms)\n`);
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            
            console.log(`  Error response for ${methodName}:`);
            console.log(`    ${error.message}`);
            
            this.results.push({
                method: methodName,
                category,
                supported: false,
                error: error.message,
                executionTime
            });
            
            console.log(`   ${methodName} - Not supported (${error.message})\n`);
        }
    }

    private truncateResponse(response: any): any {
        const responseStr = JSON.stringify(response);
        if (responseStr.length > 500) {  // Increased from 200 to 500 for better visibility
            try {
                return JSON.parse(`${responseStr.substring(0, 500)}... [truncated]`);
            } catch {
                return `${responseStr.substring(0, 500)}... [truncated]`;
            }
        }
        return response;
    }

    private generateReport(): RpcTestReport {
        const supported = this.results.filter(r => r.supported).length;
        const total = this.results.length;
        const successRate = ((supported / total) * 100).toFixed(1);

        return {
            chainName: this.chainName,
            rpcUrl: this.rpcUrl,
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: {
                total,
                supported,
                unsupported: total - supported,
                successRate: `${successRate}%`
            }
        };
    }

    async saveReport(report: RpcTestReport): Promise<string> {
        const reportDir = path.join(process.cwd(), 'eth', this.chainName);
        const reportPath = path.join(reportDir, 'rpc_methods_report.md');

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const markdownReport = this.generateMarkdownReport(report);
        fs.writeFileSync(reportPath, markdownReport);
        
        console.log(`\n📄 RPC Report saved to: ${reportPath}`);
        return reportPath;
    }

    private generateMarkdownReport(report: RpcTestReport): string {
        const categorizedResults = this.categorizeResults(report.results);
        
        let markdown = `# RPC Methods Support Report\n\n`;
        markdown += `---\n\n`;
        markdown += `**📅 Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;
        markdown += `## ⛓️ Chain Details\n`;
        markdown += `- **Name:** ${report.chainName}\n`;
        markdown += `- **RPC:** ${report.rpcUrl}\n\n`;
        markdown += `## 📊 Summary\n`;
        markdown += `- **Total Methods Tested:** ${report.summary.total}\n`;
        markdown += `- **Supported:** ${report.summary.supported}\n`;
        markdown += `- **Unsupported:** ${report.summary.unsupported}\n`;
        markdown += `- **Success Rate:** ${report.summary.successRate}\n\n`;

        for (const [category, results] of Object.entries(categorizedResults)) {
            markdown += `## ${category}\n\n`;
            markdown += `| Method | Status | Execution Time | Notes |\n`;
            markdown += `|--------|--------|----------------|-------|\n`;
            
            for (const result of results) {
                const status = result.supported ? '✅ Supported' : '❌ Not Supported';
                const time = result.executionTime ? `${result.executionTime}ms` : 'N/A';
                const notes = result.supported ? 'Working' : result.error || 'Unknown error';
                
                markdown += `| \`${result.method}\` | ${status} | ${time} | ${notes} |\n`;
            }
            markdown += `\n`;
        }

        return markdown;
    }

    private categorizeResults(results: RpcTestResult[]): Record<string, RpcTestResult[]> {
        const categorized: Record<string, RpcTestResult[]> = {};
        
        for (const result of results) {
            if (!categorized[result.category]) {
                categorized[result.category] = [];
            }
            categorized[result.category].push(result);
        }
        
        return categorized;
    }
}
