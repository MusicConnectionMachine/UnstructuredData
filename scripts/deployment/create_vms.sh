#!/bin/bash
: ${1?Please specify a ssh password}

az group create -l westeurope -n parser2-euwest
az group create -l southeastasia -n parser2-seasia
az group create -l southindia -n parser2-sindia
az group create -l centralindia -n parser2-cindia
az group create -l eastasia -n parser2-eastasia

az network vnet create -g parser2-euwest -n euwest-vnet --address-prefixes 10.1.0.0/16
az network vnet create -g parser2-seasia -n seasia-vnet --address-prefixes 10.1.0.0/16
az network vnet create -g parser2-sindia -n sindia-vnet --address-prefixes 10.1.0.0/16
az network vnet create -g parser2-cindia -n cindia-vnet --address-prefixes 10.1.0.0/16
az network vnet create -g parser2-eastasia -n eastasia-vnet --address-prefixes 10.1.0.0/16

spinup_azure () {
    (az network nic create --resource-group "$4" --location "$2" --name "parsernic$1" --vnet "$5" --subnet default; \
    (az vm create --no-wait --resource-group "$4" --name "parser$1" --admin-username group2 --authentication-type password --admin-password "$3" --nics "parsernic$i" --size Standard_F8s --image "UbuntuLTS") &
}

sshPW=$1

for i in {0..9}
do
    echo "Deploying Nr$i"
    spinup_azure $i westeurope $sshPW parser2-euwest euwest-vnet
done
for i in {10..19}
do
    echo "Deploying Nr$i"
    spinup_azure $i southeastasia $sshPW parser2-seasia seasia-vnet
done;
for i in {20..29}
do
    echo "Deploying Nr$i"
    spinup_azure $i southindia $sshPW parser2-sindia sindia-vnet
done
for i in {30..39}
do
    echo "Deploying Nr$i"
    spinup_azure $i centralindia $sshPW parser2-cindia cindia-vnet
done
for i in {40..49}
do
    echo "Deploying Nr$i"
    spinup_azure $i eastasia $sshPW parser2-eastasia eastasia-vnet
done