import {ProcessingManager} from "./processing-manager";
import {Worker} from "./worker";

// Don't touch this otherwise Felix will kill you :P
ProcessingManager.run();
Worker.run();
