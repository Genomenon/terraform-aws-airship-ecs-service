const {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  RunTaskCommand,
} = require("@aws-sdk/client-ecs");

const ecsClient = new ECSClient();

exports.handler = async (event, context, callback) => {
  const ecs_cluster = event.ecs_cluster;
  const ecs_service = event.ecs_service;

  try {
    const servicesResponse = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: ecs_cluster,
        services: [ecs_service],
      }),
    );

    const services = servicesResponse.services;

    if (services.length > 1) {
      throw new Error(
        `Multiple services with name ${ecs_service} found in cluster ${ecs_cluster}`,
      );
    }
    if (services.length < 1) {
      throw new Error("Could not find service");
    }

    const task_family_revision = services[0].taskDefinition;

    const taskDefinitionResponse = await ecsClient.send(
      new DescribeTaskDefinitionCommand({
        taskDefinition: task_family_revision,
      }),
    );

    const taskDefinition = taskDefinitionResponse.taskDefinition;

    if (taskDefinition.containerDefinitions.length !== 1) {
      throw new Error(
        "Only a single container is supported per task definition",
      );
    }

    const started_by = event.started_by;
    const networkConfiguration = services[0].networkConfiguration;
    const launchType = services[0].launchType;

    const params = {
      taskDefinition: task_family_revision,
      networkConfiguration: networkConfiguration,
      cluster: ecs_cluster,
      count: 1,
      launchType: launchType,
      startedBy: started_by,
      overrides: event.overrides,
    };

    const data = await ecsClient.send(new RunTaskCommand(params));

    console.log(
      "Successfully started taskDefinition " +
        task_family_revision +
        "\n" +
        JSON.stringify(data),
    );
    callback(
      null,
      "Successfully started taskDefinition " +
        task_family_revision +
        "\n" +
        JSON.stringify(data),
    );
  } catch (err) {
    callback(err);
  }
};
