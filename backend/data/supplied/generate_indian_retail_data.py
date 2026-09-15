# datasets/generate_indian_retail_data.py
"""
Generates rich, authentic Indian Retail Franchise Datasets modeled after
Kaggle's Indian Retail, BigMart Sales, and Blinkit/Zepto QSR transactions datasets.
"""
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

# Outlets across Indian Metros (matching presentation slides)
outlets = [
    {"code": "BLR-001", "name": "Bengaluru – Indiranagar 100ft", "city": "Bengaluru", "region": "South", "tier": "Tier 1", "base_footfall": 1150, "mgr": "Sneha Sharma"},
    {"code": "BLR-017", "name": "Bengaluru – JP Nagar (Outlet 17)", "city": "Bengaluru", "region": "South", "tier": "Tier 1", "base_footfall": 1420, "mgr": "Siddharth Verma"}, # Slide 14 Anomaly!
    {"code": "BLR-002", "name": "Bengaluru – Koramangala 5th Block", "city": "Bengaluru", "region": "South", "tier": "Tier 1", "base_footfall": 1280, "mgr": "Karthik Nair"},
    {"code": "MUM-001", "name": "Mumbai – Bandra West Linking Rd", "city": "Mumbai", "region": "West", "tier": "Tier 1", "base_footfall": 1650, "mgr": "Rohan Kulkarni"},
    {"code": "MUM-002", "name": "Mumbai – Lower Parel High Street", "city": "Mumbai", "region": "West", "tier": "Tier 1", "base_footfall": 980, "mgr": "Ananya Mehta"},
    {"code": "DEL-001", "name": "Delhi – Connaught Place Inner Circle", "city": "Delhi", "region": "North", "tier": "Tier 1", "base_footfall": 1500, "mgr": "Harpreet Singh"},
    {"code": "DEL-002", "name": "Delhi – Cyber Hub Gurugram", "city": "Delhi NCR", "region": "North", "tier": "Tier 1", "base_footfall": 1100, "mgr": "Amitabh Sen"},
    {"code": "HYD-001", "name": "Hyderabad – Hitec City Cyber Towers", "city": "Hyderabad", "region": "South", "tier": "Tier 1", "base_footfall": 1390, "mgr": "Prashanth Rao"},
    {"code": "CHN-001", "name": "Chennai – Anna Nagar 2nd Avenue", "city": "Chennai", "region": "South", "tier": "Tier 1", "base_footfall": 920, "mgr": "Deepak Sundaram"}
]

# Products catalog (Indian QSR & Specialty Cafe items)
products = [
    {"id": "SKU-BEV-001", "name": "Artisanal Cold Brew (350ml)", "category": "Specialty Beverages", "price": 240, "cost": 65, "abc": "A"},
    {"id": "SKU-BEV-002", "name": "Monsoon Cinnamon Latte", "category": "Specialty Beverages", "price": 280, "cost": 80, "abc": "A"},
    {"id": "SKU-BEV-003", "name": "Nitro Cold Brew Infusion", "category": "Specialty Beverages", "price": 310, "cost": 90, "abc": "A"},
    {"id": "SKU-BAKE-004", "name": "Butter Flaky Croissant", "category": "Artisanal Bakery", "price": 180, "cost": 55, "abc": "B"},
    {"id": "SKU-SNK-005", "name": "Truffle Cheese Mushroom Panini", "category": "Gourmet Food", "price": 340, "cost": 120, "abc": "A"},
    {"id": "SKU-SNK-006", "name": "Smoked Paneer Tikka Sourdough", "category": "Gourmet Food", "price": 310, "cost": 105, "abc": "B"},
    {"id": "SKU-DES-007", "name": "Classic Tiramisu Cup", "category": "Desserts", "price": 260, "cost": 85, "abc": "B"},
    {"id": "SKU-PKG-008", "name": "Eco-Kraft Branded Cup (Carton)", "category": "Packaging", "price": 950, "cost": 620, "abc": "C"}
]

payment_methods = ["UPI (GooglePay/PhonePe)", "UPI (GooglePay/PhonePe)", "Credit Card", "Debit Card", "Cash"]
customer_segments = ["Champion", "Loyal Customer", "Potential Loyalist", "At Risk", "Hibernating"]

# Generate 2,500 Transactions over the past 45 days
records = []
start_date = datetime(2026, 7, 20)

for i in range(1, 2601):
    day_offset = random.randint(0, 45)
    tx_date = start_date + timedelta(days=day_offset)
    is_weekend = tx_date.weekday() >= 5
    
    outlet = random.choice(outlets)
    prod = random.choice(products)
    qty = random.choices([1, 2, 3, 4], weights=[0.55, 0.30, 0.10, 0.05])[0]
    
    hour = random.choices(
        [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
        weights=[3, 4, 6, 8, 12, 14, 10, 7, 8, 12, 16, 18, 15, 10, 4]
    )[0]
    
    gross = prod["price"] * qty
    
    # Specific Anomaly for Outlet 17: Frequent unauthorized manual 25% discount override!
    if outlet["code"] == "BLR-017" and random.random() < 0.45:
        discount_pct = 25.0
        override_code = "OVERRIDE_MGR_01"
    elif random.random() < 0.15:
        discount_pct = float(random.choice([5, 10, 15]))
        override_code = "CAMPAIGN_CODE_PROMO"
    else:
        discount_pct = 0.0
        override_code = "NONE"
        
    net = round(gross * (1 - discount_pct / 100), 2)
    profit = round(net - (prod["cost"] * qty), 2)
    margin_pct = round((profit / net) * 100, 2) if net > 0 else 0
    
    payment = random.choice(payment_methods)
    rating = random.choices([5, 4, 3, 2, 1], weights=[0.60, 0.25, 0.08, 0.04, 0.03])[0]
    if outlet["code"] == "BLR-017" and discount_pct == 25:
        rating = random.choices([5, 4, 3, 2, 1], weights=[0.30, 0.25, 0.20, 0.15, 0.10])[0]
        
    segment = random.choices(customer_segments, weights=[0.25, 0.35, 0.20, 0.12, 0.08])[0]
    
    # Footfall estimation
    footfall = int(outlet["base_footfall"] * (1.35 if is_weekend else 1.0) + random.randint(-80, 120))
    
    records.append({
        "Transaction_ID": f"TXN-IN-{10000 + i}",
        "Date": tx_date.strftime("%Y-%m-%d"),
        "Hour": hour,
        "Is_Weekend": 1 if is_weekend else 0,
        "Outlet_Code": outlet["code"],
        "Outlet_Name": outlet["name"],
        "City": outlet["city"],
        "Region": outlet["region"],
        "Product_ID": prod["id"],
        "Product_Name": prod["name"],
        "Category": prod["category"],
        "ABC_Classification": prod["abc"],
        "Unit_Price_INR": prod["price"],
        "Unit_Cost_INR": prod["cost"],
        "Quantity": qty,
        "Gross_Revenue_INR": gross,
        "Discount_Pct": discount_pct,
        "Discount_Override_Code": override_code,
        "Net_Revenue_INR": net,
        "Gross_Profit_INR": profit,
        "Margin_Pct": margin_pct,
        "Payment_Method": payment,
        "Customer_Rating": rating,
        "Customer_Segment": segment,
        "Store_Footfall_Day": footfall
    })

df_sales = pd.DataFrame(records)
df_sales.to_csv("datasets/indian_retail_sales_kaggle.csv", index=False)
print(f"Generated datasets/indian_retail_sales_kaggle.csv with {len(df_sales)} rows.")

# 2. Generate Customer Reviews Dataset for NLP Sentiment Analysis
reviews = [
    {"text": "Amazing cold brew and fantastic ambiance in Indiranagar! The staff is very polite and fast.", "rating": 5, "outlet": "BLR-001"},
    {"text": "My favorite cafe in Bangalore. High quality coffee and perfect croissants.", "rating": 5, "outlet": "BLR-002"},
    {"text": "Extremely disappointed. Outlet 17 opened 45 minutes late and cold brew was completely out of stock!", "rating": 1, "outlet": "BLR-017"},
    {"text": "Bandra branch has great music and vibe, but seating is crowded during peak Sunday evenings.", "rating": 4, "outlet": "MUM-001"},
    {"text": "Cashier applied manual discount without asking, but waiting time was almost 25 minutes. Needs more staff.", "rating": 2, "outlet": "BLR-017"},
    {"text": "Best truffle panini in Connaught Place. Fast service and clean tables.", "rating": 5, "outlet": "DEL-001"},
    {"text": "Sanitation in the washroom was sub-par today. Coffee was good though.", "rating": 3, "outlet": "DEL-002"},
    {"text": "Super quick takeaway at Hitec City. Great UPI scan and go experience.", "rating": 5, "outlet": "HYD-001"},
    {"text": "They ran out of Barista milk and syrup on a Saturday afternoon! How can a coffee shop not have stock?", "rating": 1, "outlet": "BLR-017"},
    {"text": "Prompt service, clean counter, hygienic preparation observed.", "rating": 5, "outlet": "CHN-001"}
]

review_records = []
for i in range(350):
    base = random.choice(reviews)
    outlet = random.choice(outlets)
    review_records.append({
        "Review_ID": f"REV-{1000 + i}",
        "Outlet_Code": base["outlet"] if random.random() < 0.6 else outlet["code"],
        "Review_Text": base["text"],
        "Rating": base["rating"],
        "Source": random.choice(["Google Reviews", "Zomato", "Swiggy Dineout", "Customer App"]),
        "Date": (start_date + timedelta(days=random.randint(0, 45))).strftime("%Y-%m-%d")
    })

df_reviews = pd.DataFrame(review_records)
df_reviews.to_csv("datasets/customer_feedback_sentiment.csv", index=False)
print(f"Generated datasets/customer_feedback_sentiment.csv with {len(df_reviews)} rows.")
