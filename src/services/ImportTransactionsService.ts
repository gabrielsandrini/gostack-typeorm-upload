import fs from 'fs';
import csvParse from 'csv-parse';

import CreateTransactionService from './CreateTransactionService';

import Transaction from '../models/Transaction';

interface Request {
  file_path: string;
}

interface TransactionData {
  title: string;
  type: string;
  value: number;
  category_title: string;
}

interface TransactionDataByType {
  income: TransactionData[];
  outcome: TransactionData[];
}

type RawData = Array<Array<string>>;

class ImportTransactionsService {
  private async readCSV({ file_path }: Request): Promise<RawData> {
    // Create Streams
    const readStream = fs.createReadStream(file_path);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readStream.pipe(parseStream);

    // Read file
    const lines: RawData = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return lines;
  }

  private async deleteFile({ file_path }: Request): Promise<void> {
    await fs.promises.unlink(file_path);
  }

  private rawDataToTransactionData(rawData: RawData): TransactionData[] {
    const transactionsData: TransactionData[] = rawData.map(data => {
      const [title, type, value, category] = data;
      return {
        title,
        type,
        value: Number(value),
        category_title: category,
      };
    });

    return transactionsData;
  }

  private groupByTransactionType(
    transactionsData: TransactionData[],
  ): TransactionDataByType {
    const transactionsDataByType = transactionsData.reduce(
      (accumulator: TransactionDataByType, transaction) => {
        const { type } = transaction;

        switch (type) {
          case 'income':
            accumulator.income.push(transaction);
            break;

          case 'outcome':
            accumulator.outcome.push(transaction);
            break;

          default:
            break;
        }

        return accumulator;
      },
      {
        income: [],
        outcome: [],
      },
    );
    return transactionsDataByType;
  }

  private async saveTransactions(
    type: 'income' | 'outcome',
    transactionsData: TransactionData[],
  ): Promise<Transaction[]> {
    const createTransaction = new CreateTransactionService();

    const transactions: Transaction[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const transaction of Object.values(transactionsData)) {
      const { title, value, category_title } = transaction;
      transactions.push(
        // eslint-disable-next-line no-await-in-loop
        await createTransaction.execute({
          title,
          type,
          value,
          category_title,
        }),
      );
    }

    return transactions;
  }

  async execute({ file_path }: Request): Promise<Transaction[]> {
    const rawData = await this.readCSV({ file_path });

    const transactionsData = this.rawDataToTransactionData(rawData);
    const transactionsDataByType = this.groupByTransactionType(
      transactionsData,
    );

    /*
     * The incomes operations are being executed before the outcome operations
     * to avoid throw the "not enought money" error when creating new
     * transactions
     */

    const incomeTransactions = await this.saveTransactions(
      'income',
      transactionsDataByType.income,
    );

    const outcomeTransactions = await this.saveTransactions(
      'outcome',
      transactionsDataByType.outcome,
    );

    await this.deleteFile({ file_path });

    return [...incomeTransactions, ...outcomeTransactions];
  }
}

export default ImportTransactionsService;
