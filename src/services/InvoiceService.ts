import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';
// @ts-ignore – library has no types
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import uuid from 'react-native-uuid';
import { Invoice } from '../models/Invoice';
import { Loan } from '../models/Loan';

class InvoiceService {
  private buildLoanInvoiceHtml(loan: Loan) {
    const rows = loan.payments
      .map(
        p => `
        <tr>
          <td>${new Date(p.date).toLocaleDateString()}</td>
          <td style="text-align:right;">${p.amount.toFixed(2)}</td>
          <td>${p.notes || ''}</td>
        </tr>`,
      )
      .join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Loan Statement</h1>
          <p><strong>Counterpart:</strong> ${loan.counterpartName}</p>
          <p><strong>Principal:</strong> ${loan.principal.toFixed(2)}</p>
          <p><strong>Balance:</strong> ${loan.balance.toFixed(2)}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="3" style="text-align:center;">No payments yet</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `;
  }

  async printLoanInvoice(loan: Loan) {
    const html = this.buildLoanInvoiceHtml(loan);
    await RNPrint.print({ html });
  }

  async saveAndUploadLoanInvoice(loan: Loan) {
    const html = this.buildLoanInvoiceHtml(loan);
    const { filePath } = await (RNPrint as any).printToFile({ html });

    // upload to Firebase Storage
    const filename = `invoices/${uuid.v4()}.pdf`;
    const ref = storage().ref(filename);
    await ref.putFile(filePath);
    const downloadUrl = await ref.getDownloadURL();

    // save metadata to Firestore
    const invoice: Invoice = {
      id: uuid.v4().toString(),
      loanId: loan.id,
      fileUrl: downloadUrl,
      createdAt: Date.now(),
    };
    await firestore().collection('invoices').doc(invoice.id).set(invoice);

    return invoice;
  }

  async printAndUploadLoanInvoice(loan: Loan) {
    const html = this.buildLoanInvoiceHtml(loan);

    // 1. Show print dialog
    if (Platform.OS === 'ios') {
      // iOS can print HTML directly
      await RNPrint.print({ html });
    } else {
      // Android: create PDF then print
      try {
        const pdf = await RNHTMLtoPDF.convert({ html, fileName: `invoice_${loan.id}` });
        await RNPrint.print({ filePath: pdf.filePath });
      } catch (e) {
        console.warn('Print failed', e);
      }
    }

    // 2. Generate PDF file (cross-platform) for upload
    let pdfPath: string | undefined;
    if (Platform.OS === 'ios') {
      try {
        const { filePath } = await (RNPrint as any).printToFile({ html });
        pdfPath = filePath;
      } catch (e) {
        console.warn('printToFile failed, fallback to HTMLtoPDF', e);
      }
    }
    if (!pdfPath) {
      const pdf = await RNHTMLtoPDF.convert({ html, fileName: `invoice_${loan.id}` });
      pdfPath = pdf.filePath;
    }

    // 3. Upload
    try {
      const filename = `invoices/${uuid.v4()}.pdf`;
      const ref = storage().ref(filename);
      await ref.putFile(pdfPath!);
      const downloadUrl = await ref.getDownloadURL();
      const invoice: Invoice = {
        id: uuid.v4().toString(),
        loanId: loan.id,
        fileUrl: downloadUrl,
        createdAt: Date.now(),
      };
      await firestore().collection('invoices').doc(invoice.id).set(invoice);
    } catch (e) {
      console.warn('Upload invoice failed', e);
    }
  }
}

export const invoiceService = new InvoiceService();