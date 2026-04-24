CREATE DATABASE IF NOT EXISTS medical_ai_demo;

USE medical_ai_demo;

SELECT * FROM users;

CREATE TABLE users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)     NOT NULL UNIQUE,
  role ENUM('patient', 'provider') NOT NULL DEFAULT 'patient',
  provider_code VARCHAR(8) UNIQUE DEFAULT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE patient_provider (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id INT UNSIGNED NOT NULL,
    provider_id INT UNSIGNED NOT NULL,
    linked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_patient (patient_id),
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE prescriptions (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  name        VARCHAR(100)    NOT NULL,
  dosage      VARCHAR(50)     NOT NULL,
  type        ENUM('hours','daily') NOT NULL,
  value       SMALLINT UNSIGNED NOT NULL,
  amount SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  last_taken  DATETIME        DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE known_medications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE drug_interactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  med_a VARCHAR(100) NOT NULL,
  med_b VARCHAR(100) NOT NULL,
  severity ENUM('minor', 'moderate', 'severe') NOT NULL,
  description VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE brand_names (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    brand_name VARCHAR(100) NOT NULL UNIQUE,
    generic_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE alerts (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    message VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE dosage_limits (
	id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    generic_name VARCHAR(100) NOT NULL UNIQUE,
    max_single_otc DECIMAL(8,2) DEFAULT NULL,
    max_single DECIMAL(8,2) NOT NULL,
    max_daily_otc DECIMAL(8,2) DEFAULT NULL,
    max_daily DECIMAL(8,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'mg',
    PRIMARY KEY (id)
);

INSERT INTO dosage_limits (generic_name, max_single, max_single_otc, max_daily, max_daily_otc, unit) VALUES
('ibuprofen', '800', '400', '3200', '1200', 'mg');

INSERT INTO brand_names (brand_name, generic_name) VALUES
	('tylenol',     'acetaminophen'),
  ('advil',       'ibuprofen'),
  ('motrin',      'ibuprofen'),
  ('aleve',       'naproxen'),
  ('bayer',       'aspirin'),
  ('bufferin',    'aspirin'),
  ('ecotrin',     'aspirin'),
  ('coumadin',    'warfarin'),
  ('zoloft',      'sertraline'),
  ('prozac',      'fluoxetine'),
  ('xanax',       'alprazolam'),
  ('valium',      'diazepam'),
  ('glucophage',  'metformin'),
  ('lipitor',     'atorvastatin'),
  ('zestril',     'lisinopril'),
  ('prinivil',    'lisinopril'),
  ('amoxil',      'amoxicillin'),
  ('cipro',       'ciprofloxacin'),
  ('deltasone',   'prednisone'),
  ('ultram',      'tramadol');

INSERT INTO known_medications (name) VALUES
  ('ibuprofen'),
  ('aspirin'),
  ('warfarin'),
  ('lisinopril'),
  ('metformin'),
  ('atorvastatin'),
  ('amoxicillin'),
  ('ciprofloxacin'),
  ('sertraline'),
  ('fluoxetine'),
  ('alprazolam'),
  ('diazepam'),
  ('oxycodone'),
  ('acetaminophen'),
  ('prednisone');



INSERT INTO drug_interactions (med_a, med_b, severity, description) VALUES
  ('ibuprofen',     'aspirin',       'moderate', 'Taking both increases risk of stomach bleeding.'),
  ('ibuprofen',     'warfarin',      'severe',   'Ibuprofen increases bleeding risk when taken with Warfarin.'),
  ('ibuprofen',     'lisinopril',    'moderate', 'Ibuprofen can reduce the effectiveness of Lisinopril.'),
  ('aspirin',       'warfarin',      'severe',   'Aspirin and Warfarin together greatly increase bleeding risk.'),
  ('warfarin',      'acetaminophen', 'moderate', 'High doses of Acetaminophen can increase Warfarin effects.'),
  ('sertraline',    'fluoxetine',    'severe',   'Combining two SSRIs can cause serotonin syndrome.'),
  ('sertraline',    'alprazolam',    'moderate', 'May cause increased sedation and drowsiness.'),
  ('fluoxetine',    'alprazolam',    'moderate', 'May cause increased sedation and drowsiness.'),
  ('alprazolam',    'diazepam',      'severe',   'Combining two benzodiazepines increases overdose risk.'),
  ('alprazolam',    'oxycodone',     'severe',   'Combining benzodiazepines with opioids can cause fatal respiratory depression.'),
  ('diazepam',      'oxycodone',     'severe',   'Combining benzodiazepines with opioids can cause fatal respiratory depression.'),
  ('ciprofloxacin', 'warfarin',      'severe',   'Ciprofloxacin significantly increases Warfarin levels in blood.'),
  ('metformin',     'prednisone',    'moderate', 'Prednisone can raise blood sugar and reduce Metformin effectiveness.'),
  ('atorvastatin',  'amoxicillin',   'minor',     'Minor interaction, monitor for any unusual muscle pain.');