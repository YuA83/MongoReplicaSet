# MongoReplicaSet

MongoDB Replica Set Test

```
docker pull mongo
```

```
docker network create mongoCluster
```

```
openssl rand -base64 756 > ./mongodb.key
```

```
chmod 400 ./mongodb.key
```

```
docker-compose up -d
```

```
mongosh -u root

rs.initiate({_id: "myReplicaSet",members:[{_id: 0, host: "mongo1"},{_id: 1, host: "mongo2"},{_id: 2, host: "mongo3"}]});
```

```
docker-compose down
```
