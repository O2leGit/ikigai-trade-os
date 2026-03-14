CREATE TABLE `account_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` varchar(32) NOT NULL,
	`accountName` varchar(64) NOT NULL,
	`accountType` varchar(64) NOT NULL,
	`statementDate` varchar(32) NOT NULL,
	`nlv` decimal(14,2) NOT NULL,
	`openPnl` decimal(14,2) NOT NULL DEFAULT '0',
	`ytdPnl` decimal(14,2) NOT NULL DEFAULT '0',
	`summary` text,
	`rawCsv` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `account_uploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `critical_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`accountId` varchar(32) NOT NULL,
	`priority` int NOT NULL DEFAULT 1,
	`action` text NOT NULL,
	CONSTRAINT `critical_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equity_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`accountId` varchar(32) NOT NULL,
	`symbol` varchar(16) NOT NULL,
	`quantity` decimal(12,4) NOT NULL,
	`avgCost` decimal(14,4),
	`mark` decimal(14,4),
	`openPnl` decimal(14,2),
	`openPnlPct` decimal(8,4),
	`action` varchar(32) DEFAULT 'HOLD',
	`rationale` text,
	CONSTRAINT `equity_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `options_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploadId` int NOT NULL,
	`accountId` varchar(32) NOT NULL,
	`symbol` varchar(64) NOT NULL,
	`underlying` varchar(16),
	`expiry` varchar(16),
	`strike` decimal(10,2),
	`optionType` varchar(4),
	`quantity` decimal(10,2) NOT NULL,
	`avgCost` decimal(14,4),
	`mark` decimal(14,4),
	`openPnl` decimal(14,2),
	`action` varchar(32) DEFAULT 'HOLD',
	`rationale` text,
	CONSTRAINT `options_positions_id` PRIMARY KEY(`id`)
);
