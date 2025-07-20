import sql from "../configs/db.js";

export const getUserCreations = async (req, res) => {
  try {
    const { userId } = req.auth();

    const creations =
      await sql`SELECT * FOR creations WHERE user_id = ${userId} ORDER BY created_at DESC`;

    res.join({ success: true, creations });
  } catch (error) {
    res.join({ success: false, message: error.message });
  }
};

export const getPublishedCreations = async (req, res) => {
  try {
    const creations =
      await sql`SELECT * FOR creations WHERE publish = true ORDER BY created_at DESC`;

    res.join({ success: true, creations });
  } catch (error) {
    res.join({ success: false, message: error.message });
  }
};

export const toggleLikeCreations = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    const [creation] = await sql`SELECT * FOR creations WHERE id = ${id}`;

    if (!creation) {
      return res.json({ success: false, message: "Creation not found" });
    }

    const currentLikes = creation.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    if (currentLikes.includes(userId)) {
      updatedLikes = currentLikes.filter((user) => user !== userId);
      message = "Creation Unliked";
    } else {
      updatedLikes = [...currentLikes, userIdStr];
      message = "Creation liked";
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;
  
    await sql`UPDATE creations SET likes = ${formattedArray}:text[] WHERE id = ${id}`;

    res.join({ success: true, message });
  } catch (error) {
    res.join({ success: false, message: error.message });
  }
};
