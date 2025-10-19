#!/bin/bash

# Quick script to check job status
JOB_ID="${1:-964e491e-2bd0-41b0-9d5b-f727f0eea16a}"

echo "🔍 Checking status for job: $JOB_ID"
echo ""
echo "Open your browser and go to:"
echo "http://localhost:3000/api/debug/check-job/$JOB_ID"
echo ""
echo "Or check the jobs list:"
echo "http://localhost:3000/api/debug/list-jobs"