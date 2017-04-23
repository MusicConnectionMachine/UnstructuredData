#!/bin/bash
: ${1?Please specify the last part of your vnet ip}
: ${2?Please specify a ssh password}
sudo apt-get install sshpass
for i in {4..13}
do
	if [ $i != $1 ]
	then
		echo "starting vm $starti at ip 10.1.0.$i"
		sshpass -p '2)4>{5,d@z]GRz2D' ssh -o "StrictHostKeyChecking no" "group2@10.1.0.$i" < setup_instance.sh
		echo "copying config.json"
		sshpass -p '2)4>{5,d@z]GRz2D' scp config.json "group2@10.1.0.$i:~/UnstructuredData/config.json"
		echo "starting execution"
		sshpass -p '2)4>{5,d@z]GRz2D' ssh -n -f "group2@10.1.0.$i" "sh -c 'cd UnstructuredData && nohup node out/app.js -t 4 -p 8 > /dev/null 2>&1 &'"
	fi
done
echo "starting myself at ip 10.1.0.$i"
chmod +x setup_instance.sh
./setup_instance.sh
cp config.json UnstructuredData/config.json
cd UnstructuredData
nohup node out/app.js -t 4 -p 8 &