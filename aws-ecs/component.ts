import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";


    interface LoadBalancerComponentArgs {
        loadBalancerName: string;
        vpcId: string;
        subnets: string[];
        securityGroups: string[];
        targetGroupPort: number;

    }

    export class LoadBalancerComponent extends pulumi.ComponentResource {

         public readonly targetGroupArn: pulumi.Output<string>;
         
        constructor(name: string, args: LoadBalancerComponentArgs, opts?: pulumi.ComponentResourceOptions) {
            super("myproject:components:LoadBalancerComponent", name, args, opts);

            
            const loadBalancer = new aws.lb.LoadBalancer(args.loadBalancerName, {
                loadBalancerType: "network",
                subnets: args.subnets, 
                securityGroups: args.securityGroups, 
            });

            const targetGroup = new aws.lb.TargetGroup("target-group", { 
                    port: args.targetGroupPort,
                    //protocol: "TCP", 
                    //targetType: "alb",
                    protocol: "HTTP",
                    targetType: "ip",
                    vpcId: args.vpcId, 
                    healthCheck: { 
                        path: "/",
                        protocol: "HTTP",
                        matcher: "200",
                        interval: 30,
                        timeout: 5,
                        healthyThreshold: 2,
                    },
            });

            
            const listener = new aws.lb.Listener("listener", {
                loadBalancerArn: loadBalancer.arn,
                defaultActions: [{
                    type: "forward",
                    targetGroupArn: targetGroup.arn,
                }],
                port: 8080,
                protocol: "HTTP"
            });

            this.targetGroupArn = targetGroup.arn;
    }


};