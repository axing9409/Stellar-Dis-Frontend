import BigNumber from "bignumber.js";
import { logger } from "./logger";

type CSVTotalAmountProps = {
  csvFile?: File;
  columnName?: string;
  decimalPlaces?: number;
};

export const csvTotalAmount = ({
  csvFile,
  columnName = "amount",
  decimalPlaces = 7, // Default for Stellar amounts
}: CSVTotalAmountProps): Promise<BigNumber | null> => {
  if (!csvFile) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(csvFile);

    reader.onload = () => {
      try {
        const csvRows = reader.result?.toString();
        if (!csvRows) {
          logger.warn('CSV file is empty', { fileName: csvFile.name }, 'CSVProcessing');
          resolve(null);
          return;
        }

        const lines = csvRows.split("\n").filter(line => line.trim() !== '');
        if (lines.length < 2) {
          logger.warn('CSV file has insufficient data', { 
            fileName: csvFile.name, 
            lineCount: lines.length 
          }, 'CSVProcessing');
          resolve(null);
          return;
        }

        const [header, ...rows] = lines;
        const columns = header.split(",").map(col => col.trim());
        const amountIndex = columns.indexOf(columnName);
        
        if (amountIndex === -1) {
          logger.warn('Amount column not found in CSV', { 
            fileName: csvFile.name,
            columnName,
            availableColumns: columns
          }, 'CSVProcessing');
          resolve(null);
          return;
        }

        let totalAmount = BigNumber(0);
        let validRows = 0;
        let invalidRows = 0;
        const errors: string[] = [];

        rows.forEach((line, index) => {
          if (!line.trim()) return;

          try {
            const values = line.split(",").map(val => val.trim());
            const amountValue = values[amountIndex];

            if (!amountValue || amountValue === '') {
              invalidRows++;
              errors.push(`Row ${index + 2}: Empty amount value`);
              return;
            }

            const amount = new BigNumber(amountValue);
            
            // Validate amount
            if (amount.isNaN()) {
              invalidRows++;
              errors.push(`Row ${index + 2}: Invalid amount format: ${amountValue}`);
              return;
            }

            if (amount.isNegative()) {
              invalidRows++;
              errors.push(`Row ${index + 2}: Negative amount: ${amountValue}`);
              return;
            }

            if (amount.decimalPlaces() > decimalPlaces) {
              logger.warn('Amount exceeds decimal places limit', {
                row: index + 2,
                amount: amountValue,
                decimalPlaces,
                fileName: csvFile.name
              }, 'CSVProcessing');
            }

            totalAmount = totalAmount.plus(amount);
            validRows++;

          } catch (error) {
            invalidRows++;
            errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        // Log processing results
        logger.info('CSV total amount calculated successfully', {
          fileName: csvFile.name,
          columnName,
          totalAmount: totalAmount.toString(),
          validRows,
          invalidRows,
          totalRows: rows.length
        }, 'CSVProcessing');

        if (invalidRows > 0) {
          logger.warn('CSV processing completed with errors', {
            fileName: csvFile.name,
            invalidRows,
            errors: errors.slice(0, 10) // Log first 10 errors
          }, 'CSVProcessing');
        }

        resolve(totalAmount);
      } catch (error) {
        logger.error('Failed to process CSV file', error, 'CSVProcessing');
        reject(error);
      }
    };

    reader.onerror = (error) => {
      logger.error('Failed to read CSV file', error, 'CSVProcessing');
      reject(error);
    };
  });
};

// Helper function to validate CSV structure
export const validateCSVStructure = (csvContent: string, requiredColumns: string[]): {
  isValid: boolean;
  missingColumns: string[];
  availableColumns: string[];
} => {
  const lines = csvContent.split("\n").filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return {
      isValid: false,
      missingColumns: requiredColumns,
      availableColumns: []
    };
  }

  const header = lines[0];
  const columns = header.split(",").map(col => col.trim());
  const missingColumns = requiredColumns.filter(col => !columns.includes(col));

  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    availableColumns: columns
  };
};

// Helper function to get CSV statistics
export const getCSVStatistics = (csvContent: string, amountColumn: string = "amount"): {
  rowCount: number;
  totalAmount: BigNumber;
  averageAmount: BigNumber;
  minAmount: BigNumber;
  maxAmount: BigNumber;
  validRows: number;
  invalidRows: number;
} => {
  const lines = csvContent.split("\n").filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    return {
      rowCount: 0,
      totalAmount: BigNumber(0),
      averageAmount: BigNumber(0),
      minAmount: BigNumber(0),
      maxAmount: BigNumber(0),
      validRows: 0,
      invalidRows: 0
    };
  }

  const [header, ...rows] = lines;
  const columns = header.split(",").map(col => col.trim());
  const amountIndex = columns.indexOf(amountColumn);

  if (amountIndex === -1) {
    return {
      rowCount: rows.length,
      totalAmount: BigNumber(0),
      averageAmount: BigNumber(0),
      minAmount: BigNumber(0),
      maxAmount: BigNumber(0),
      validRows: 0,
      invalidRows: rows.length
    };
  }

  const amounts: BigNumber[] = [];
  let invalidRows = 0;

  rows.forEach((line, index) => {
    if (!line.trim()) return;

    try {
      const values = line.split(",").map(val => val.trim());
      const amountValue = values[amountIndex];

      if (amountValue && amountValue !== '') {
        const amount = new BigNumber(amountValue);
        if (!amount.isNaN() && !amount.isNegative()) {
          amounts.push(amount);
        } else {
          invalidRows++;
        }
      } else {
        invalidRows++;
      }
    } catch {
      invalidRows++;
    }
  });

  if (amounts.length === 0) {
    return {
      rowCount: rows.length,
      totalAmount: BigNumber(0),
      averageAmount: BigNumber(0),
      minAmount: BigNumber(0),
      maxAmount: BigNumber(0),
      validRows: 0,
      invalidRows
    };
  }

  const totalAmount = amounts.reduce((sum, amount) => sum.plus(amount), BigNumber(0));
  const averageAmount = totalAmount.dividedBy(amounts.length);
  const minAmount = BigNumber.minimum(...amounts);
  const maxAmount = BigNumber.maximum(...amounts);

  return {
    rowCount: rows.length,
    totalAmount,
    averageAmount,
    minAmount,
    maxAmount,
    validRows: amounts.length,
    invalidRows
  };
};
