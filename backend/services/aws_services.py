"""
FactoryFlow AI - AWS Services Wrapper
=====================================
Integrates AWS services as defined in the Factory.pdf system architecture.
"""

import boto3
import json
import logging
from backend.config import AWS_REGION, AWS_S3_BUCKET_HISTORICAL, AWS_SNS_TOPIC_ALERTS

logger = logging.getLogger(__name__)

# Initialize boto3 clients
try:
    s3_client = boto3.client('s3', region_name=AWS_REGION)
    sns_client = boto3.client('sns', region_name=AWS_REGION)
    cloudwatch_client = boto3.client('cloudwatch', region_name=AWS_REGION)
except Exception as e:
    logger.warning(f"AWS Credentials not fully configured. Using mock clients. Error: {e}")
    s3_client = None
    sns_client = None
    cloudwatch_client = None

def upload_historical_data_to_s3(machine_id: str, data: dict):
    """
    Uploads historical machine sensor data or events to Amazon S3.
    """
    if not s3_client:
        logger.info(f"[MOCK S3] Uploading data for machine {machine_id} to bucket {AWS_S3_BUCKET_HISTORICAL}")
        return True
        
    try:
        object_key = f"historical_data/{machine_id}/{data.get('timestamp', 'unknown')}.json"
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_HISTORICAL,
            Key=object_key,
            Body=json.dumps(data)
        )
        return True
    except Exception as e:
        logger.error(f"Failed to upload to S3: {e}")
        return False

def send_anomaly_alert(alert_type: str, machine_id: str, message: str, severity: str = "HIGH"):
    """
    Sends an alert notification via Amazon SNS.
    """
    alert_payload = {
        "alert_type": alert_type,
        "machine_id": machine_id,
        "severity": severity,
        "message": message
    }
    
    if not sns_client:
        logger.info(f"[MOCK SNS] Sending alert to {AWS_SNS_TOPIC_ALERTS}: {json.dumps(alert_payload)}")
        return True
        
    try:
        sns_client.publish(
            TopicArn=AWS_SNS_TOPIC_ALERTS,
            Message=json.dumps(alert_payload),
            Subject=f"Factory Anomaly Alert: {machine_id} ({severity})"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send SNS alert: {e}")
        return False

def log_cloudwatch_metric(metric_name: str, value: float, machine_id: str):
    """
    Logs custom factory metrics to Amazon CloudWatch.
    """
    if not cloudwatch_client:
        logger.info(f"[MOCK CloudWatch] Logging {metric_name} = {value} for machine {machine_id}")
        return True
        
    try:
        cloudwatch_client.put_metric_data(
            Namespace='FactoryFlow',
            MetricData=[
                {
                    'MetricName': metric_name,
                    'Dimensions': [
                        {'Name': 'MachineId', 'Value': machine_id}
                    ],
                    'Value': value,
                    'Unit': 'None'
                }
            ]
        )
        return True
    except Exception as e:
        logger.error(f"Failed to log metric to CloudWatch: {e}")
        return False
