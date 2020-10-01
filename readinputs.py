import sys, json, threading, time, random, os , pigpio, socket, statistics
import RPi.GPIO as GPIO
from time import perf_counter
##frequence string:
freq = [
    "propulsion.0.revolutions",
    "propulsion.1.revolutions",
    "electrical.alternators.0.revolutions",
    "electrical.alternators.1.revolutions",
    "propulsion.0.fuel.rate",
    "propulsion.1.fuel.rate",
    "navigation.speedThroughWater",
]
state= [
    "navigation.lights",
    "propulsion.0.state",
    "propulsion.1.state",

]

################################################################## classes
class MeasureFrequency(object):
    
    def __init__(self, channel):
        GPIO.setup(channel, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        self.channel = channel
        self.pulse1 = 0
        self.pulsetime1=perf_counter()
        self.freq=0
        self.data = []

    def _interrupt_counter(self, channel):
        diff = perf_counter()-self.pulsetime1
        self.pulsetime1=perf_counter()
        self.data.append(diff)
        

    def frequency(self):
        sum_=0
        count=0
        freq=0
        try:
            freq=statistics.mean(self.data)
            freq=1/freq
        except:
            freq=0
        self.data=[]
        return freq
    def start(self):
        GPIO.add_event_detect(self.channel, GPIO.RISING,
                              callback=self._interrupt_counter,
                              bouncetime=1)

class MovingAverage:
    def __init__(self,factor):
        self.factor=float(factor)
        self.current=0

    def add(self,value):
        fv=float(value)
        diff=fv-self.current
        self.current+=self.factor*diff

    def value(self):
        return self.current



## GPIO settings
GPIO.setmode(GPIO.BCM)
try:
    #os.system("sudo pigpiod")
    #time.sleep(2)
    pass
except: pass
try:
    st1read =pigpio.pi()
except: pass

try:
    st1read.bb_serial_read_close(19) #close if already run
except: pass
try:
    st1read.bb_serial_read_close(16) #close if already run
except: pass
try:
    st1read.bb_serial_read_close(26) #close if already run
except: pass
try:
    st1read.bb_serial_read_close(20) #close if already run
except: pass


x=sys.stdin.readline()

#sys.stderr.write(x)

data=json.dumps(x)
y = json.loads(x)
inputs= y["inputs"]

In1_ =False
In2_ =False
In3_ =False
In4_ =False

#check for configurated inputs and his task:
count=0
for i in inputs:
    inputs_=inputs[count]
    if inputs_["inputID"]=="In1":
        In1=i
        In1_=True
        if In1["key"] in freq:
            In1task="freq"
            measure1=MeasureFrequency(19)
            measure1.start()
            average1=MovingAverage(0.6)
        if In1["key"] in state:
            In1task="state"
        if In1["key"]=="seatalk1":
            In1task="st1"
    if inputs_["inputID"]=="In2":
        In2=i
        In2_=True
        if In2["key"] in freq:
            In2task="freq"
            measure2=MeasureFrequency(16)
            measure2.start()
            average2=MovingAverage(0.6)
        if In2["key"] in state:
            In2task="state"
        if In2["key"]=="seatalk1":
            In2task="st1"
    if inputs_["inputID"]=="In3":
        In3=i
        In3_=True
        if In3["key"] in freq:
            In3task="freq"
            measure3=MeasureFrequency(26)
            measure3.start()
            average3=MovingAverage(0.6)
        if In3["key"] in state:
            In3task="state"
        if In3["key"]=="seatalk1":
            In3task="st1"
    if inputs_["inputID"]=="In4":
        In4=i
        In4_=True
        if In4["key"] in freq:
            In4task="freq"
            measure4=MeasureFrequency(20)
            measure4.start()
            average4=MovingAverage(0.6)
        if In4["key"] in state:
            In4task="state"
        if In4["key"]=="seatalk1":
            In4task="st1"
    count+=1

################################################################ MAIN    
while True:
    values=[]
    if In1_:
        if In1task=="freq":
            freq1=measure1.frequency()
            average1.add(freq1)
            freq1_=average1.value()
            freq1_=freq1_*float(In1["multiplier"])
            freq1_=round(freq1_,2)
            values.append( {'path': In1["key"] , 'value': freq1_ } )
    if In2_:
        if In2task=="freq":
            freq2=measure2.frequency()
            average2.add(freq2)
            freq2_=average2.value()
            freq2_=freq2_*float(In2["multiplier"])
            freq2_=round(freq2_,2)
            values.append( {'path': In2["key"] , 'value': freq2_ } )       
    if In3_:
        if In3task=="freq":
            freq3=measure3.frequency()
            average3.add(freq3)
            freq3_=average3.value()
            freq3_=freq3_*float(In3["multiplier"])
            freq3_=round(freq3_,2)
            values.append( {'path': In3["key"] , 'value': freq3_ } )
    if In4_:
        if In3task=="freq":
            freq4=measure4.frequency()
            average4.add(freq4)
            freq4_=average4.value()
            freq4_=freq4_*float(In4["multiplier"])
            freq4_=round(freq4_,2)
            values.append( {'path': In4["key"] , 'value': freq4_ } )
    if values:
        signalkdata = {'updates': [{ 'values': values}]}

        sys.stdout.write(json.dumps(signalkdata)) 
        sys.stdout.write('\n')
        sys.stdout.flush()
    

    #sys.stderr.write(str(values))
    #sys.stderr.flush()
    time.sleep(0.2)



