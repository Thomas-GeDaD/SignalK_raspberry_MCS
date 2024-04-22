#!/usr/bin/env python

# Copyright 2020 Thomas Gersmann - GeDaD <t.gersmann@gedad.de>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import time, os
from gpiozero import Button

# this file runs as a service in the background
def main():
	try: #### GPIO Config
		#in5 = Button(5,pull_up=False)
		in5 = Button(5,pull_up=False)
		print(in5.is_pressed)
		if in5.is_pressed:
			while True:
				print("in while")
				if not in5.is_pressed:
					print ("shutdown in 2s")
					time.sleep(2)
					if not in5.is_pressed:
						os.system("sudo shutdown -h now") 
						#os.system("sudo reboot")
				time.sleep(2)
		else:
			print ("MCS=> autoshutdown disable")
	except Exception as e: print (str(e))

if __name__ == '__main__':
	main()
