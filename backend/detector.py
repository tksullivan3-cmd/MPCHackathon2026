"""
Legacy entry point — delegates to fraud_detection package.

Prefer: from fraud_detection import detect_fraud, run_pipeline
"""

from fraud_detection import detect_fraud, run_pipeline

__all__ = ["detect_fraud", "run_pipeline"]
