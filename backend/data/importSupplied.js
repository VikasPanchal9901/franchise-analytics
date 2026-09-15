const fs = require('fs');
const path = require('path');

function readCsv(fileName) {
  const filePath = path.join(__dirname, 'supplied', fileName);
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/);
  const parseLine = (line) => {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(cell); cell = ''; }
      else cell += char;
    }
    cells.push(cell);
    return cells;
  };
  const headers = parseLine(lines.shift());
  return lines.filter(Boolean).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function importSuppliedRetail(db, outletIds) {
  const sales = readCsv('indian_retail_sales_kaggle.csv');
  const feedback = readCsv('customer_feedback_sentiment.csv');
  const outletByCode = new Map(outletIds.map((outlet) => [outlet.code, outlet.id]));
  const products = new Map();
  sales.forEach((row) => {
    if (!products.has(row.Product_ID)) products.set(row.Product_ID, row);
  });

  const insertProduct = db.prepare(`INSERT INTO products (sku,name,category,unit_cost,unit_price) VALUES (?,?,?,?,?)`);
  const productBySku = new Map();
  products.forEach((row) => {
    const result = insertProduct.run(row.Product_ID, row.Product_Name, row.Category, number(row.Unit_Cost_INR), number(row.Unit_Price_INR));
    productBySku.set(row.Product_ID, Number(result.lastInsertRowid));
  });

  const insertSale = db.prepare(`
    INSERT INTO sales (outlet_id,product_id,date,quantity,revenue,discount,transaction_id,hour,is_weekend,payment_method,customer_rating,customer_segment,footfall)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  let importedSales = 0;
  sales.forEach((row) => {
    const outletId = outletByCode.get(row.Outlet_Code);
    const productId = productBySku.get(row.Product_ID);
    if (!outletId || !productId) return;
    insertSale.run(
      outletId, productId, row.Date, number(row.Quantity), number(row.Net_Revenue_INR),
      number(row.Gross_Revenue_INR) - number(row.Net_Revenue_INR), row.Transaction_ID,
      number(row.Hour), number(row.Is_Weekend), row.Payment_Method, number(row.Customer_Rating),
      row.Customer_Segment, number(row.Store_Footfall_Day)
    );
    importedSales += 1;
  });

  const insertFeedback = db.prepare(`INSERT INTO customer_feedback (review_id,outlet_id,review_text,rating,source,date) VALUES (?,?,?,?,?,?)`);
  let importedFeedback = 0;
  feedback.forEach((row) => {
    const outletId = outletByCode.get(row.Outlet_Code);
    if (!outletId) return;
    insertFeedback.run(row.Review_ID, outletId, row.Review_Text, number(row.Rating), row.Source, row.Date);
    importedFeedback += 1;
  });

  // Use supplied customer feedback as the network's displayed outlet rating.
  db.exec(`
    UPDATE outlets SET customer_rating = COALESCE((
      SELECT ROUND(AVG(f.rating), 2) FROM customer_feedback f WHERE f.outlet_id = outlets.id
    ), customer_rating)
  `);

  return {
    source: 'User-provided Indian retail franchise datasets',
    files: ['indian_retail_sales_kaggle.csv', 'customer_feedback_sentiment.csv'],
    sales: importedSales,
    feedback: importedFeedback,
    products: products.size,
    salesPeriod: sales.length ? { start: sales.reduce((a, b) => a.Date < b.Date ? a : b).Date, end: sales.reduce((a, b) => a.Date > b.Date ? a : b).Date } : null,
  };
}

module.exports = { importSuppliedRetail };
