CREATE DATABASE IF NOT EXISTS wastewise
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wastewise;

CREATE TABLE IF NOT EXISTS products (
  product_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  PRIMARY KEY (product_id),
  INDEX ix_products_name (name),
  INDEX ix_products_category (category)
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  batch_id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  received_at DATE NOT NULL,
  expiry_date DATE NOT NULL,
  quantity_received INT NOT NULL,
  quantity_remaining INT NOT NULL,
  PRIMARY KEY (batch_id),
  INDEX ix_inventory_batches_product_id (product_id),
  INDEX ix_inventory_batches_expiry_date (expiry_date),
  CONSTRAINT fk_inventory_batches_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);

CREATE TABLE IF NOT EXISTS sales (
  sale_id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  store_id VARCHAR(40) NOT NULL DEFAULT 'default',
  sold_on DATE NOT NULL,
  units_sold INT NOT NULL,
  unit_price FLOAT NULL,
  discount_pct FLOAT NOT NULL DEFAULT 0,
  PRIMARY KEY (sale_id),
  INDEX ix_sales_product_id (product_id),
  INDEX ix_sales_sold_on (sold_on),
  INDEX ix_sales_store_date (store_id, sold_on),
  CONSTRAINT fk_sales_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);

CREATE TABLE IF NOT EXISTS waste_records (
  waste_record_id INT NOT NULL AUTO_INCREMENT,
  product_id INT NOT NULL,
  wasted_on DATE NOT NULL,
  waste_units INT NOT NULL,
  PRIMARY KEY (waste_record_id),
  INDEX ix_waste_records_product_id (product_id),
  INDEX ix_waste_records_wasted_on (wasted_on),
  CONSTRAINT fk_waste_records_product
    FOREIGN KEY (product_id) REFERENCES products (product_id)
);