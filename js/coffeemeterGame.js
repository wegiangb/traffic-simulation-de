
//################################################################
// GUI: Start/Stop button callback (triggered by "onclick" in html file)
//#################################################################

// in any case need first to stop;
// otherwise multiple processes after clicking 2 times start
// define no "var myRun "; otherwise new local instance started
// whenever myRun is inited

var isStopped=false; // only initialization

function myRestartFunction(){

    clearInterval(myRun);
    init(); // set times to zero, re-initialize road

    // update state of "Stop/Resume button 
    isStopped=false;
    document.getElementById('stopResume').innerHTML="Stop";
    myRun=start();
}

function myStopResumeFunction(){

    clearInterval(myRun);
    console.log("in myStopResumeFunction: isStopped=",isStopped);

    if(isStopped){
        isStopped=false;
        document.getElementById('stopResume').innerHTML="Stop";
        myRun=start();
    }
    else{
        document.getElementById('stopResume').innerHTML="Resume";
        isStopped=true;
    }
}



//#############################################
// model specifications and fixed settings 
// (these are GUI-sliders in the "normal" scenarios)
//#############################################

var timewarp=2;
var scale=2.3;   // pixel/m probably overridden (check!)
var qIn=0;       // no additional vehicles

var IDM_v0=30;
var IDM_T=1.5;
var IDM_s0=2;
var IDM_a=1.0;
var IDM_b=2;
var IDMtruck_v0=22.23;
var IDMtruck_T=2;
var IDMtruck_a=0.6;

var MOBIL_bSafe=4;    // bSafe if v to v0
var MOBIL_bSafeMax=17; // bSafe if v to 0
var MOBIL_bThr=0.2;
var MOBIL_bBiasRight_car=-0.2;
var MOBIL_bBiasRight_truck=0.1;

var MOBIL_mandat_bSafe=6;
var MOBIL_mandat_bSafeMax=20;
var MOBIL_mandat_bThr=0;
var MOBIL_mandat_biasRight=20;

var dt_LC=4; // duration of a lane change


// derived objects

var longModelCar=new ACC(IDM_v0,IDM_T,IDM_s0,IDM_a,IDM_b);
var longModelTruck=new ACC(IDMtruck_v0,IDMtruck_T,IDM_s0,IDMtruck_a,IDM_b);
var LCModelCar=new MOBIL(MOBIL_bSafe, MOBIL_bSafeMax,
                         MOBIL_bThr, MOBIL_bBiasRight_car);
var LCModelTruck=new MOBIL(MOBIL_bSafe, MOBIL_bSafeMax,
                           MOBIL_bThr, MOBIL_bBiasRight_truck);
var LCModelMandatoryRight=new MOBIL(MOBIL_mandat_bSafe, MOBIL_mandat_bSafeMax,
                                    MOBIL_mandat_bThr, MOBIL_mandat_biasRight);
var LCModelMandatoryLeft=new MOBIL(MOBIL_mandat_bSafe, MOBIL_mandat_bSafeMax,
                                    MOBIL_mandat_bThr, -MOBIL_mandat_biasRight);


 

//#############################################################
// graphical settings/variables
//#############################################################

var hasChanged=true; // whether window dimensions has changed (resp. design)

var drawBackground=true; // if false, default unicolor background
var drawRoad=true; // if false, only vehicles are drawn

var vmin=0; // min speed for speed colormap (drawn in red)
var vmax=100/3.6; // max speed for speed colormap (drawn in blue-violet)



//#############################################################
// physical geometry settings [m]
//#############################################################

var sizePhys=100;  // visible road section [m] (scale=canvas.height/sizePhys)

// 'S'-shaped mainroad

var lenStraightBegin=150;
var lenCurve=200; // each of the left and right curve making up the 'S'
var lenStraightEnd=250;
var maxAng=0.3; // maximum angle of the S bend (if <0, mirrored 'S')

// for optical purposes both lanes and cars bigger than in reality

var nLanes=3;
var laneWidth=7;
var car_length=7; // car length in m
var car_width=5; // car width in m
var truck_length=15; // trucks
var truck_width=7; 

// derived quantities and functions

var lenMainroad=lenStraightBegin+2*lenCurve+lenStraightEnd;
var curvature=maxAng/lenCurve; // positive if first curve is left curve

// phys coords start road
var xBegin=0.7*sizePhys; // portrait with aspect ratio 6:10 
var yBegin=-sizePhys;    // road from -sizePhys to about lenMainroad-sizePhys

// phys coords begin first curve
var y1=yBegin+lenStraightBegin;

// phys coords center of 'S'
var y2=y1+Math.sin(maxAng)/curvature;

// phys coords end of 'S'
var y3=2*y2-y1;


// road geometry in physical coordinates 
// (norcmal CS, x=>toRght, y=>toTop )

function traj_x(u){ 
    var u1=lenStraightBegin;
    var u2=lenStraightBegin+lenCurve;
    var u3=lenStraightBegin+2*lenCurve;

    var x1=xBegin; //phys coords begin first curve
    var x2=x1-(1-Math.cos(maxAng))/curvature; //center of 'S'
    var x3=2*x2-x1; // end of 'S'

    var x=(u<u1)
	? xBegin : (u<u2)
	? x1-(1-Math.cos(maxAng*(u-u1)/(u2-u1)))/curvature : (u<u3)
	? x3+(1-Math.cos(maxAng*(u3-u)/(u3-u2)))/curvature : x3;
    return x;
}

function traj_y(u){ 
    var u1=lenStraightBegin;
    var u2=lenStraightBegin+lenCurve;
    var u3=lenStraightBegin+2*lenCurve;

    var y1=yBegin+lenStraightBegin;
    var y2=y1+Math.sin(maxAng)/curvature;
    var y3=2*y2-y1; // end of 'S'

    var y=(u<u1)
	? yBegin + u : (u<u2)
	? y1+Math.sin(maxAng*(u-u1)/(u2-u1))/curvature : (u<u3)
	? y3-Math.sin(maxAng*(u3-u)/(u3-u2))/curvature : y3+u-u3;
    return y;
}
 






//#################################
// Global graphics specification
//#################################

var canvas;
var ctx;  // graphics context
 
var background = new Image();
var carImg = new Image();
var truckImg = new Image();
var obstacleImg = new Image();
var roadImg = new Image();

background.src ='figs/backgroundGrass.jpg'; // set drawBackground=false if no bg

carImg.src='figs/blackCarCropped.gif';
truckImg.src='figs/truck1Small.png';
obstacleImg.src='figs/obstacleImg.png';

roadImg.src=
    (nLanes==1) ? 'figs/oneLaneRoadRealisticCropped.png' :
    (nLanes==2) ? 'figs/twoLanesRoadRealisticCropped.png' :
    'figs/threeLanesRoadRealisticCropped.png';



//###############################################################
// physical (m) road  specification and sim initialization
//###############################################################

// IDM_v0 etc and updateModels() with actions  "longModelCar=new ACC(..)" etc
// defined in gui.js


// initialize road with zero density as macroscopic initial condition 

var isRing=0;  // 0: false; 1: true
var roadIDmain=1;
var densityInit=0;
var speedInit=0; // not relevant since initially no vehicles
var truckFracInit=0; // not relevant since initially no vehicles

var mainroad=new road(roadIDmain, lenMainroad, nLanes, densityInit, speedInit, 
		      truckFracInit, isRing);

var time=0;
var itime=0;
init();




//############################################
// run-time specification and functions
//############################################

var fps=30; // frames per second (unchanged during runtime)
var dt=timewarp/fps;


//##############################################################
// initialize simulation without completely new loading 
// (this would be window.location.href = "./coffeemeterGame.html";)
// thus saving all past global interactions such as changed parameters
//##############################################################

function init(){  
    time=0;
    itime=0;

    // specify microscopic init conditions (direct/deterministic
    // control possibility crucial for game!)


    var types  =[0,    0,    1,    0];
    var lengths=[8,    5,    14,   7];
    var widths =[4.5,  4,    6,  4.5];
    var longPos=[50,   60,   70,  80];
    var lanes  =[0,    1,    2,    0];
    var speeds =[25,   25,   0,   30];

    mainroad.initializeMicro(types,lengths,widths,longPos,lanes,speeds);
}



//#################################################################
function update(){
//#################################################################

    // update times

    time +=dt; // dt depends on timewarp slider (fps=const)
    itime++;

    // transfer effects from slider interaction 
    // and changed mandatory states to the vehicles and models 

    //console.log("\nbefore mainroad.writeVehicles:"); mainroad.writeVehicles();
    mainroad.updateModelsOfAllVehicles(longModelCar,longModelTruck,
				       LCModelCar,LCModelTruck); //!! test if needed

 
    // do central simulation update of vehicles

    mainroad.updateLastLCtimes(dt);
    //console.log("1: mainroad.nveh=",mainroad.veh.length);
    mainroad.calcAccelerations();  
    mainroad.changeLanes();         
    //console.log("3: mainroad.nveh=",mainroad.veh.length);
    mainroad.updateSpeedPositions();
    mainroad.updateBCdown();
    //console.log("5: mainroad.nveh=",mainroad.veh.length);
    mainroad.updateBCup(qIn,dt); // argument=total inflow
    //console.log("6: mainroad.nveh=",mainroad.veh.length);

    if(true){
	for (var i=0; i<mainroad.nveh; i++){
	    if(mainroad.veh[i].speed<0){
		console.log("speed "+mainroad.veh[i].speed
			    +" of mainroad vehicle "
			    +i+" is negative!");
	    }
	}
    }


    //logging

    if(false){
        console.log("\nafter update: itime="+itime+" mainroad.nveh="+mainroad.nveh);
	for(var i=0; i<mainroad.veh.length; i++){
	    console.log("i="+i+" mainroad.veh[i].u="+mainroad.veh[i].u
			+" mainroad.veh[i].v="+mainroad.veh[i].v
			+" mainroad.veh[i].lane="+mainroad.veh[i].lane
			+" mainroad.veh[i].laneOld="+mainroad.veh[i].laneOld);
	}
	console.log("\n");
    }

}//update




//##################################################
function draw() {
//##################################################

    //!!! test relative motion
    var relObserver=true;
    var uObs=20*time;

    /* (0) redefine graphical aspects of road (arc radius etc) using
     responsive design if canvas has been resized 
     (=actions of canvasresize.js for the ring-road scenario,
     here not usable ecause of side effects with sizePhys)
     */

    var critAspectRatio=1.15;
    var hasChanged=false;
    var simDivWindow=document.getElementById("contents");

    if (canvas.width!=simDivWindow.clientWidth){
	hasChanged=true;
	canvas.width  = simDivWindow.clientWidth;
    }
    if (canvas.height != simDivWindow.clientHeight){
	hasChanged=true;
        canvas.height  = simDivWindow.clientHeight;
    }
    var aspectRatio=canvas.width/canvas.height;
    var refSizePix=Math.min(canvas.height,canvas.width/critAspectRatio);

    if(hasChanged){

      scale=canvas.height/sizePhys; 
      if(true){
	console.log("canvas has been resized: new dim ",
		    canvas.width,"X",canvas.height," refSizePix=",
		    refSizePix," sizePhys=",sizePhys," scale=",scale);
      }
    }






    // update heading of all vehicles rel. to road axis
    // (for some reason, strange rotations at beginning)

    mainroad.updateOrientation(); 



    // (2) set transform matrix and draw background if needed
    // moving observer => select appropriate pair of tiles in y direction!

    var iLowerTile=Math.floor( (traj_y(uObs)-yBegin)/sizePhys);
    var xLeftPix= scale*(xBegin-traj_x(uObs))-0.1*canvas.width;
    var yTopPix=-scale*(yBegin+sizePhys*iLowerTile-traj_y(uObs));

    if(drawBackground&&(hasChanged||(itime<=2) || (itime==20) || relObserver 
			|| (!drawRoad))){

        // lower tile
	ctx.setTransform(1,0,0,1,xLeftPix,yTopPix);
        ctx.drawImage(background,0,0,canvas.width,canvas.height);

        // upper tile
	yTopPix-=scale*sizePhys;
	ctx.setTransform(1,0,0,1,xLeftPix,yTopPix);
        ctx.drawImage(background,0,0,canvas.width,canvas.height);
    }


    // (3) draw mainroad
    // (always drawn; changedGeometry only triggers building a new lookup table)

    var changedGeometry=hasChanged||(itime<=1)||true; 

    mainroad.draw(roadImg,scale,traj_x,traj_y,laneWidth,changedGeometry,
		  relObserver,uObs,xBegin,yBegin); //!!

 
    // (4) draw vehicles

 

    mainroad.drawVehicles(carImg,truckImg,obstacleImg,scale,traj_x,traj_y,
			  laneWidth, vmin, vmax,
                        0,lenMainroad,relObserver,uObs,xBegin,yBegin);



    // (5) draw some running-time vars

  if(true){
    ctx.setTransform(1,0,0,1,0,0); 
    var textsize=0.02*Math.min(canvas.width,canvas.height); // 2vw;
    ctx.font=textsize+'px Arial';

    var timeStr="Time="+Math.round(10*time)/10;
    var timeStr_xlb=textsize;

    var timeStr_ylb=1.8*textsize;
    var timeStr_width=6*textsize;
    var timeStr_height=1.2*textsize;

    ctx.fillStyle="rgb(255,255,255)";
    ctx.fillRect(timeStr_xlb,timeStr_ylb-timeStr_height,
		 timeStr_width,timeStr_height);
    ctx.fillStyle="rgb(0,0,0)";
    ctx.fillText(timeStr, timeStr_xlb+0.2*textsize,
		 timeStr_ylb-0.2*textsize);

    
    var scaleStr="scale="+Math.round(10*scale)/10;
    var scaleStr_xlb=9*textsize;
    var scaleStr_ylb=timeStr_ylb;
    var scaleStr_width=5*textsize;
    var scaleStr_height=1.2*textsize;
    ctx.fillStyle="rgb(255,255,255)";
    ctx.fillRect(scaleStr_xlb,scaleStr_ylb-scaleStr_height,
		 scaleStr_width,scaleStr_height);
    ctx.fillStyle="rgb(0,0,0)";
    ctx.fillText(scaleStr, scaleStr_xlb+0.2*textsize, 
		 scaleStr_ylb-0.2*textsize);
    
  
    // (6) draw the speed colormap

      drawColormap(0.86*canvas.width,
                   0.88*canvas.height,
                   0.1*canvas.width, 0.2*canvas.height,
		   vmin,vmax,0,100/3.6);

    // revert to neutral transformation at the end!
    ctx.setTransform(1,0,0,1,0,0); 
  }
}
 


function start() {

    // get overall dimensions from parent html page

    canvas = document.getElementById("canvas_coffeeGame"); 
    ctx = canvas.getContext("2d");
 
    width  = canvas.width;   // pixel coordinates (DOS)
    height = canvas.height;  // DOS

    // starts simulation thread "main_loop" (defined below) 
    // with update time interval 1000/fps milliseconds

    return setInterval(main_loop, 1000/fps); 
} // end start()


//##################################################
// Running function of the sim thread (triggered by setInterval)
//##################################################

function main_loop() {
    draw();
    update();
}
 

//##################################################
// Actual start of the simulation thread 
// Notice: init() and start() are the only top-level calls of the simulation
// top-level: called by "onload" event of js in webpage
//##################################################

 
 var myRun=start(); //if start with onramp: init, starts thread "main_loop" 

