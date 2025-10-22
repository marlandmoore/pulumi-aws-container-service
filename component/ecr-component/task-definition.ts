import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface TaskDefArgs {
    
}

export class TaskDef extends pulumi.ComponentResource {

    constructor(name: string, args: TaskDefArgs, opts?: pulumi.ComponentResourceOptions) {
        super("static-page-component:index:StaticPage", name, args, opts);
        const ecsExecutionRoleArgs: aws.iam.RoleArgs = {
        // 1. Trust Policy: Allows ECS tasks to assume this role.
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ecs-tasks.amazonaws.com",
        }),

        // 2. Managed Policies: The standard policy that grants ECR pull and CloudWatch log permissions.
        managedPolicyArns: [
            "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        ],

        namePrefix: "app-exec-role-",
};

}