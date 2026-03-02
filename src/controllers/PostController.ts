import prisma from "../../prisma/client";

export async function getPosts() {
  try {
    const posts = await prisma.post.findMany({ orderBy: { id: "desc" } });
    return {
      success: true,
      message: "Berhasil Get Data",
      data: posts,
    };
  } catch (error) {
    console.error("Server Internal Error", error);
  }
}

export async function CreatePost(body: { title: string; content: string }) {
  try {
    const { title, content } = body;

    const post = await prisma.post.create({
      data: {
        title: title,
        content: content,
      },
    });
    return {
      success: true,
      message: "Berhasil Post Data",
      data: post,
    };
  } catch (error) {
    console.error("Server Internal Error", Error);
  }
}
