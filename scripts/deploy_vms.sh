#!/bin/bash

spinup_azure () {
    (az disk create --resource-group "group2-parser" --name "disk$1" --source "https://group2parserdisks520.blob.core.windows.net/vhds/vm120170419163019.vhd" \
    ; az network nic create --resource-group "group2-parser" --location "$2" --name "parsernic$1" \
    --vnet group2-parser-vnet --subnet default \
    ; az vm create --no-wait --resource-group "group2-parser" --name "parser$1" --admin-username group2 --authentication-type password --admin-password "$3" --nics "parsernic$i" --size Standard_F8s --os-type Linux --attach-os-disk "disk$1") &
}

sshPW = "I may be stupid but not that stupid"

for i in {0..19}
do
    echo "Deploying Nr$i"
    spinup_azure $i westeurpoe $sshPW
done;
for i in {20..39}
do
    echo "Deploying Nr$i"
    spinup_azure $i northeurope $sshPW
done;
for i in {40..59}
do
    echo "Deploying Nr$i"
    spinup_azure $i westus $sshPW
done
for i in {60..79}
do
    echo "Deploying Nr$i"
    spinup_azure $i eastus $sshPW
done
for i in {80..99}
do
    echo "Deploying Nr$i"
    spinup_azure $i eastasia $sshPW
done