#!/bin/sh
stfil-cli init

if [ "$#" -ne 4 ]; then
    echo "Error: four parameters are required"
    exit 1
fi

action=$1
nodeId=$2
available=$3
amount=$4

# 判断第一个参数
if [ "$action" = "autoSealLoad" ]; then
    stfil-cli splp node autoSealLoad "$nodeId" -alt "$available" -a "$amount"
elif [ "$action" = "autoRepay" ]; then
    stfil-cli splp node autoRepay "$nodeId" -agt "$available" -a "$amount"
else
    echo "Not Action：$action"
fi
