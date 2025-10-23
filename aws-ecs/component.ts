import * as pulumi from "@pulumi/pulumi";
import * as  aws from "@pulumi/pulumi";

    interface DemoComponentArgs {
        // Define any input properties your component needs
        message: string;
    }

    export class DemoComponent extends pulumi.ComponentResource {
        //public readonly outputMessage: pulumi.Output<string>;

        constructor(name: string, args: DemoComponentArgs, opts?: pulumi.ComponentResourceOptions) {
            super("myproject:components:DemoComponent", name, args, opts);


    }

};