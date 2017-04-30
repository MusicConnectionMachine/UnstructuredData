#!/bin/bash
: ${1?Please specify a ssh password}

az group create -l westeurope -n parser2-euwest
az group create -l northeurope -n parser2-eunorth

az network vnet create -g parser2-euwest -n euwest-vnet --address-prefixes 10.1.0.0/16
az network vnet create -g parser2-eunorth -n eunorth-vnet --address-prefixes 10.1.0.0/16

az network vnet subnet create --name default --vnet-name euwest-vnet --resource-group westeurope --address-prefix 10.1.0.0/24
az network vnet subnet create --name default --vnet-name eunorth-vnet --resource-group northeurope --address-prefix 10.1.0.0/24

spinup_azure () {
    (az network nic create --resource-group "$4" --location "$2" --name "parsernic$1" --vnet "$5" --subnet default; \
    az vm create --no-wait --resource-group "$4" --name "parser$1" --admin-username group2 --authentication-type password --admin-password "$3" --nics "parsernic$i" --size Standard_F8s --image "UbuntuLTS") &
}

sshPW=$1

for i in {0..24}
do
    echo "Deploying Nr$i"
    spinup_azure $i westeurope $sshPW parser2-euwest euwest-vnet
done
for i in {25..49}
do
    echo "Deploying Nr$i"
    spinup_azure $i northeurope $sshPW parser2-eunorth eunorth-vnet
done;