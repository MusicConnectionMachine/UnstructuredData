#!/bin/bash

sudo apt-get install sshpass

sshPW = "I may be stupid but not that stupid"

size = 665

start = 16
end = $((start + size))

for ip in 10.0.0.{2..254}; do
  if ping -i 0.2 -c 1 $ip | grep "1 received"
  then
    sshpass -p "$sshPW" ssh "group2@$ip" < "nohup sh -c 'cd UnstructuredData/out && node app.js -t 4 -w $start:$end -p 8 -c CC-MAIN-2017-13' &"
    start = $((start + size))
    end = $((end + $size))
  fi
done