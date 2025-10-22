import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Allocate a new VPC with the default settings.
const vpc = new awsx.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    natGateways: {
        strategy: awsx.ec2.NatGatewayStrategy.Single,
    },
});

export {vpc} ;
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;