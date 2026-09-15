const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const db = require('../db');
  const counts = {
    products: db.prepare('SELECT COUNT(*) AS count FROM products').get().count,
    salesRows: db.prepare('SELECT COUNT(*) AS count FROM sales').get().count,
    feedbackRows: db.prepare('SELECT COUNT(*) AS count FROM customer_feedback').get().count,
    outlets: db.prepare('SELECT COUNT(*) AS count FROM outlets').get().count,
  };
  const period = db.prepare('SELECT MIN(date) AS start, MAX(date) AS end FROM sales').get();
  res.json({
    sources: [{
      id: 'supplied-indian-retail',
      name: 'User-provided Indian Retail Franchise Datasets',
      citation: 'Provided by the project owner in datasets.zip; the archive includes indian_retail_sales_kaggle.csv and customer_feedback_sentiment.csv.',
      license: 'Source attribution was not included in the supplied archive; retain the project-owner attribution until an upstream license is confirmed.',
      role: 'Products, outlet-level sales transactions, footfall, customer ratings, and customer feedback',
      transformation: 'CSV rows are imported directly; net revenue is stored as revenue, gross-minus-net is stored as discount, and feedback averages update outlet customer ratings.',
      period,
      counts,
    }],
  });
});

module.exports = router;
