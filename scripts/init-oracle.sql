-- Oracle Database Initialization Script for Turf Booking Platform
-- Run as SYSDBA

-- Create tablespace for the application
CREATE TABLESPACE turf_data
  DATAFILE '/opt/oracle/oradata/XE/turf_data.dbf'
  SIZE 500M AUTOEXTEND ON NEXT 100M MAXSIZE UNLIMITED
  EXTENT MANAGEMENT LOCAL AUTOALLOCATE
  SEGMENT SPACE MANAGEMENT AUTO;

-- Create application user
CREATE USER turf_app IDENTIFIED BY turf_app_password
  DEFAULT TABLESPACE turf_data
  TEMPORARY TABLESPACE temp
  QUOTA UNLIMITED ON turf_data;

-- Grant necessary privileges
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW, CREATE PROCEDURE TO turf_app;
GRANT CREATE TRIGGER, CREATE TYPE, CREATE MATERIALIZED VIEW TO turf_app;
GRANT UNLIMITED TABLESPACE TO turf_app;

-- Grant JSON and Spatial privileges (if available)
BEGIN
  EXECUTE IMMEDIATE 'GRANT EXECUTE ON SYS.DBMS_JSON TO turf_app';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'GRANT EXECUTE ON MDSYS.SDO_GEOM TO turf_app';
EXCEPTION
  WHEN OTHERS THEN NULL;
END;
/

-- Create indexes for better performance (will be created by Prisma migrations)
-- This script runs before Prisma migrations

-- Enable supplementary logging for CDC if needed
-- ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;

EXIT;