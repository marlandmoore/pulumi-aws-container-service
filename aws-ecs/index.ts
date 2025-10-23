import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as component from "./component"

const config = new pulumi.Config();

const containerPort = config.getNumber("container-service:containerPort") || 8080;
const cpuValue = config.getNumber("container-service:cpu") || 512; 
const memoryValue = config.getNumber("container-service:memory") || 1024; 
const region = aws.config.region;


const vpcId = config.require("vpcId");
const subnetIds = config.requireObject<string[]>("subnets"); 
const securityGroupId = config.require("security-groupId"); 
const displayName = config.require("display_name");

const repo = new awsx.ecr.Repository("repo", {
    forceDelete: true,
    name: "app",
});

const image = new awsx.ecr.Image("image", {
    repositoryUrl: repo.repository.repositoryUrl,
    context: "./app",
    platform: "linux/amd64",
});


// Create ECS Cluster
const cluster = new aws.ecs.Cluster("cluster");

const taskAssumeRolePolicy = aws.iam.getPolicyDocument({
    statements: [{
        actions: ["sts:AssumeRole"],
        principals: [{
            type: "Service",
            identifiers: ["ecs-tasks.amazonaws.com"],
        }],
        effect: "Allow",
    }],
});

const taskExecutionRole = new aws.iam.Role("ecsTaskRole", {
    assumeRolePolicy: taskAssumeRolePolicy.then(policy => policy.json),
    name: "MyEcsTaskRole", 
});

const executionRole = new aws.iam.Role("executionRole" , {
     assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "ecs-tasks.amazonaws.com",
    }),
});

new aws.iam.RolePolicyAttachment("taskExecPolicy", {
    role: executionRole.name,
    policyArn: aws.iam.ManagedPolicy.AmazonECSTaskExecutionRolePolicy,
});

const containerDefinitionsJson = image.imageUri.apply(imageUri => JSON.stringify([
    {
        name: "app",
        image: imageUri, 
        cpu: cpuValue, 
        memory: memoryValue, 
        essential: true,
        portMappings: [
            {
                containerPort: containerPort,
                hostPort: containerPort, 
            },
        ],
        environment: [
            {name: "DISPLAY_NAME", value: displayName },
        ],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": `/ecs/fargate-app-${pulumi.getStack()}`,
                "awslogs-region": region,
                "awslogs-stream-prefix": "ecs",
            },
        },
    },
]));

new aws.cloudwatch.LogGroup("fargate-app-log-group", {
    name: `/ecs/fargate-app-${pulumi.getStack()}`,
    retentionInDays: 7,
});

const taskDefinition = new aws.ecs.TaskDefinition("taskdefinition", {
  family: "service",
  requiresCompatibilities: ["FARGATE"],
  networkMode: "awsvpc",
  cpu: cpuValue.toString(), 
  memory: memoryValue.toString(), 

  // Role Assignments
  taskRoleArn: taskExecutionRole.arn,
  executionRoleArn: executionRole.arn,

  containerDefinitions: containerDefinitionsJson,
});

const loadBalancerComponent = new component.LoadBalancerComponent('loadBalancer', {
    loadBalancerName: "my-lb",
    securityGroups: [securityGroupId],
    targetGroupPort: 8080,
    vpcId: vpcId, 
    subnets: subnetIds,
});

const service = new aws.ecs.Service("service", {
  launchType: "FARGATE", 
  taskDefinition: taskDefinition.arn,
  cluster: cluster.arn, 
  desiredCount: 1,

  networkConfiguration: {
    assignPublicIp: true, 
    subnets: subnetIds,
    securityGroups: [securityGroupId], 
  },

  loadBalancers: [{
        targetGroupArn: loadBalancerComponent.targetGroupArn,
        containerName: "app",
        containerPort: 8080,
    }],
});


// --- 6. Exports ---

export const taskDefinitionArn = taskDefinition.arn;
export {loadBalancerComponent}
export const ecrRepositoryUrl = repo.repository.repositoryUrl;
export const fargateServiceArn = service.arn;
