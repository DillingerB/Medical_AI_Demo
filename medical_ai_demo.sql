CREATE DATABASE IF NOT EXISTS medical_ai_demo;

USE medical_ai_demo;

CREATE TABLE users (
	id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
	id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequencyType ENUM('hours', 'daily') NOT NULL,
    frequencyValue INT NOT NULL,
    lastTaken DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
		ON DELETE CASCADE
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

INSERT INTO known_medications (name) VALUES
	('ibuprofen'),
    ('cimetidine');
    
INSERT INTO drug_interactions (med_a, med_b, severity, description) VALUES
 ('ibuprofen', 'cimetidine', 'minor', 'Could result in increased or decreased plasma concentrations.');