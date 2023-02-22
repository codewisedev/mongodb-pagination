import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { Collection, ObjectId } from 'mongodb';

/**
 * Define Sample:
 * return Paginate<CollectionType>(
 *     this.collection, //Collection
 *     1, //Limit
 *     new ObjectId('') | null, //Last item id
 *     [
 *         {
 *             $match: {}
 *         },
 *     ],
 *  );
 */

/**
 * Return: Object
 * data: []
 * total: number
 * lastId: ObjectId
 */

/**
 * It takes a collection, a limit, a lastID, and a query, and returns a paginated result
 * @param collection - The collection you want to paginate.
 * @param [limitDoc=10] - The number of documents to return.
 * @param [lastID=null] - The last ID of the previous page.
 * @param query - This is an array of objects that will be passed to the aggregate function.
 * @returns An object with the following properties:
 */
export async function paginate<CollectionType>(
    collection: Collection<CollectionType>,
    limitDoc = 10,
    lastID = null,
    query = [],
    sort: string = 'DESC',
) {
    // based on the lastID, we need to create a query that will return the next page
    const lastIdQuery = {
        ...(sort === 'DESC' && {
            $lt: ['$$item._id', lastID],
        }),
        ...(sort === 'ASC' && {
            $gt: ['$$item._id', lastID],
        }),
    };

    const result = await collection
        .aggregate([
            ...query,
            {
                $sort: {
                    _id: sort === 'DESC' ? -1 : 1,
                },
            },
            {
                $group: {
                    _id: {},
                    items: { $push: '$$ROOT' },
                    total: {
                        $sum: 1,
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    items: {
                        $filter: {
                            input: '$items',
                            as: 'item',
                            cond: lastID ? lastIdQuery : {},
                            limit: limitDoc,
                        },
                    },
                },
            },
        ])
        .toArray();

    if (result[0]) result[0].lastId = result[0]?.items.at(-1)?._id;

    return result[0];
}

/* It's a class that represents a paginated response */
@Exclude()
export class PaginateResponse<ItemType> {
    /**
     * Data
     */
    @Expose()
    data: ItemType[];

    /**
     * Total document count
     */
    @Expose()
    @Type(() => Number)
    @ApiProperty({ type: Number })
    total: number;

    /**
     * Last item id
     */
    @Expose()
    @Type(() => String)
    @ApiProperty({ type: String })
    lastId: ObjectId;
}
