import {TermLoader} from "./utils/term-loader";

TermLoader.loadFromDB((err, entities) => {
    if (err) {
        console.log("SHIT!\n", err);
        return;
    }
    console.log("\n\n\n\n");
    console.log("entities:\n", entities);

});