import { useState, useEffect } from "react";
import { Card, Row, Col, Spin, Alert, Typography, Empty } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

interface SpeckleStream {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    createdAt: string;
    commits: {
        items: Array<{
            id: string;
            message: string;
            referencedObject: string;
        }>;
    };
}

const SPECKLE_SERVER = "https://speckle.structura-most.ru";
const SPECKLE_TOKEN = "b47015ff123fc23131070342b14043c1b8a657dfb7";

const GET_STREAMS_QUERY = `
  query GetStreams {
    streams(limit: 100) {
      items {
        id
        name
        description
        updatedAt
        createdAt
        commits(limit: 1) {
          items {
            id
            message
            referencedObject
          }
        }
      }
    }
  }
`;

export const ProjectList = () => {
    const [streams, setStreams] = useState<SpeckleStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStreams();
    }, []);

    const fetchStreams = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${SPECKLE_SERVER}/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SPECKLE_TOKEN}`
                },
                body: JSON.stringify({
                    query: GET_STREAMS_QUERY
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            setStreams(data.data.streams.items);
        } catch (e: any) {
            console.error("Ошибка загрузки проектов:", e);
            setError(e?.message || "Не удалось загрузить список проектов");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <Spin size="large" />
                <p style={{ marginTop: 16, color: "#666" }}>Загрузка проектов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <Alert
                    message="Ошибка загрузки"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <button onClick={fetchStreams} style={{ marginTop: 8 }}>
                            Повторить
                        </button>
                    }
                />
            </div>
        );
    }

    if (streams.length === 0) {
        return (
            <div style={{ padding: 24 }}>
                <Empty
                    description="Проекты не найдены"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>Проекты</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Найдено проектов: {streams.length}
            </Text>

            <Row gutter={[16, 16]}>
                {streams.map((stream) => (
                    <Col key={stream.id} xs={24} sm={12} lg={8} xl={6}>
                        <Card
                            hoverable
                            onClick={() => navigate(`/projects/${stream.id}/viewer`)}
                            style={{ height: "100%" }}
                            styles={{ body: { height: "100%", display: "flex", flexDirection: "column" } }}
                        >
                            <Card.Meta
                                title={
                                    <div style={{ marginBottom: 8 }}>
                                        <Text strong ellipsis style={{ fontSize: 16 }}>
                                            {stream.name}
                                        </Text>
                                    </div>
                                }
                                description={
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <Paragraph
                                            ellipsis={{ rows: 2 }}
                                            style={{ marginBottom: 8, minHeight: 44 }}
                                        >
                                            {stream.description || "Нет описания"}
                                        </Paragraph>

                                        <div style={{ fontSize: 12 }}>
                                            <div style={{ marginBottom: 4 }}>
                                                <Text type="secondary">
                                                    📅 {formatDate(stream.updatedAt)}
                                                </Text>
                                            </div>

                                            {stream.commits.items[0] && (
                                                <div>
                                                    <Text type="secondary" ellipsis>
                                                        🔀 {stream.commits.items[0].message || "Последний коммит"}
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                }
                            />
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};
